import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.models import audit
from app.models.user import PERSONALISATION_FIELDS, PROFILE_FIELDS, User
from app.models.weight import log_weight
from app.nutrition.targets import TargetInputs, Targets, calculate_targets, canonical_goal
from app.utils.helpers import calculate_bmi
from app.activity.steps import effective_level as effective_activity_level

logger = logging.getLogger(__name__)

# Nested personalisation sections, merged field by field on update.
SECTIONS = ("food_preferences", "food_access", "lifestyle")
# Goal and body fields kept at the top level of the user document.
GOAL_DETAIL_FIELDS = (
    "goal_pace",
    "target_weight_kg",
    "body_fat_percent",
    "reproductive_status",
    "workout_days_per_week",
    "workout_time",
)
CORE_ONBOARDING_FIELDS = (
    "age",
    "gender",
    "weight_kg",
    "height_cm",
    "experience_level",
    "available_equipment",
    "injuries",
    "activity_level",
)


class UserServiceError(Exception):
    """Raised when a user-service operation fails (e.g. user not found)."""


def _profile_snapshot(user: User) -> Dict[str, Any]:
    """Return the user's profile and personalisation fields for audit diffs."""
    fields = [f for f in (*PROFILE_FIELDS, *PERSONALISATION_FIELDS) if f not in ("targets", "targets_updated_at")]
    snapshot = {field: getattr(user, field, None) for field in fields}
    snapshot["username"] = user.username
    return snapshot


def _target_inputs(user: User) -> Optional[TargetInputs]:
    """Build target inputs from the profile, or None until the basics are known."""
    if not (user.age and user.gender and user.weight_kg and user.height_cm):
        return None
    return TargetInputs(
        age=user.age,
        gender=user.gender,
        weight_kg=user.weight_kg,
        height_cm=user.height_cm,
        goal=canonical_goal(user.fitness_goal),
        pace=user.goal_pace,
        # Logged steps can move the self-reported level by one band (app/activity/steps.py).
        activity_level=effective_activity_level(user.activity_level, getattr(user, "step_activity_level", None)),
        body_fat_percent=user.body_fat_percent,
        reproductive_status=user.reproductive_status,
        workout_days_per_week=user.workout_days_per_week,
    )


def _derived_updates(user: User) -> Dict[str, Any]:
    """BMI, TDEE and targets recomputed from the user's current profile."""
    inputs = _target_inputs(user)
    if inputs is None:
        return {}
    targets = calculate_targets(inputs)
    return {
        "bmi": calculate_bmi(user.weight_kg, user.height_cm),
        "tdee": targets.tdee,
        "targets": targets.model_dump(),
        "targets_updated_at": datetime.now(timezone.utc),
    }


async def _save_with_targets(user: User, updates: Dict[str, Any], action: str) -> User:
    """Apply profile updates, recompute derived values, persist, and audit."""
    before = _profile_snapshot(user)
    for key, value in updates.items():
        setattr(user, key, value)
    updates = {**updates, **_derived_updates(user)}
    await user.update(updates)
    await audit.record_change(user.id, "profile", action, before, _profile_snapshot(user))
    return user


def _merge_sections(user: User, data: Dict[str, Any]) -> Dict[str, Any]:
    """Merge provided section answers into the stored ones (unanswered stays unanswered)."""
    updates: Dict[str, Any] = {}
    for section in SECTIONS:
        incoming = data.get(section)
        if incoming is None:
            continue
        current = dict(getattr(user, section) or {})
        current.update({k: v for k, v in incoming.items() if v is not None})
        updates[section] = current
    for field in GOAL_DETAIL_FIELDS:
        if data.get(field) is not None:
            updates[field] = data[field]
    return updates


async def complete_onboarding(user_id: str, data: Dict[str, Any]) -> User:
    """Complete onboarding: store the profile and answers, then compute targets.

    Raises:
        UserServiceError: if no user exists with ``user_id``.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise UserServiceError("User not found")

    updates: Dict[str, Any] = {field: data.get(field) for field in CORE_ONBOARDING_FIELDS}
    updates["available_equipment"] = data.get("available_equipment") or []
    updates["injuries"] = data.get("injuries") or []
    updates["activity_level"] = data.get("activity_level") or user.activity_level
    updates["fitness_goal"] = canonical_goal(data.get("fitness_goal"))
    updates["onboarding_completed"] = True
    if data.get("timezone"):
        updates["timezone"] = data["timezone"]
    updates.update(_merge_sections(user, data))

    user = await _save_with_targets(user, updates, "onboarding")
    await log_weight(user_id, data["weight_kg"])
    logger.info("Completed onboarding for user %s", user_id)
    return user


async def get_user_profile(user_id: str) -> User:
    """Return the user profile for ``user_id``.

    Raises:
        UserServiceError: if no user exists with ``user_id``.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise UserServiceError("User not found")
    return user


async def update_user_profile(user_id: str, data: Dict[str, Any]) -> User:
    """Apply a partial profile update and recompute BMI, TDEE and targets.

    Raises:
        UserServiceError: if no user exists with ``user_id``, or the new
            username is already taken.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise UserServiceError("User not found")

    updates: Dict[str, Any] = {k: v for k, v in data.items() if v is not None}
    username = updates.get("username")
    if username and username != user.username:
        if await User.get_by_username(username) is not None:
            raise UserServiceError("That username is already taken")
    if "fitness_goal" in updates:
        updates["fitness_goal"] = canonical_goal(updates["fitness_goal"])

    user = await _save_with_targets(user, updates, "update")
    if "weight_kg" in updates:
        await log_weight(user_id, updates["weight_kg"])
    logger.info("Updated profile for user %s", user_id)
    return user


async def update_personalisation(user_id: str, data: Dict[str, Any]) -> User:
    """Merge goal details and food/lifestyle answers, then recompute targets.

    Raises:
        UserServiceError: if no user exists with ``user_id``.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise UserServiceError("User not found")
    return await _save_with_targets(user, _merge_sections(user, data), "personalisation")


async def get_targets(user: User) -> Optional[Dict[str, Any]]:
    """The user's daily targets, computing and saving them for older profiles.

    Returns None until age, gender, weight and height are known.
    """
    if user.targets:
        return user.targets
    derived = _derived_updates(user)
    if not derived:
        return None
    await user.update(derived)
    return user.targets


def preview_targets(data: Dict[str, Any]) -> Targets:
    """Targets for unsaved answers (shown before the user confirms onboarding)."""
    return calculate_targets(
        TargetInputs(
            age=data["age"],
            gender=data["gender"],
            weight_kg=data["weight_kg"],
            height_cm=data["height_cm"],
            goal=canonical_goal(data.get("fitness_goal")),
            pace=data.get("goal_pace"),
            activity_level=data.get("activity_level"),
            body_fat_percent=data.get("body_fat_percent"),
            reproductive_status=data.get("reproductive_status"),
            workout_days_per_week=data.get("workout_days_per_week"),
        )
    )
