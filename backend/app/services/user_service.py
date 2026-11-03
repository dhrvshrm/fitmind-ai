import logging
from typing import Any, Dict

from app.models import audit
from app.models.user import PROFILE_FIELDS, User
from app.models.weight import log_weight
from app.utils.helpers import calculate_bmi, calculate_tdee

logger = logging.getLogger(__name__)

# Activity factor used until the user tells us their actual activity level.
DEFAULT_ACTIVITY_LEVEL = "moderate"


class UserServiceError(Exception):
    """Raised when a user-service operation fails (e.g. user not found)."""


def _profile_snapshot(user: User) -> Dict[str, Any]:
    """Return the user's profile fields (and username) for audit diffs."""
    snapshot = {field: getattr(user, field, None) for field in PROFILE_FIELDS}
    snapshot["username"] = user.username
    return snapshot


async def complete_onboarding(user_id: str, data: Dict[str, Any]) -> User:
    """Complete a user's onboarding: store profile fields and derived metrics.

    Computes BMI and TDEE from the supplied measurements, marks onboarding as
    completed, and persists everything to MongoDB.

    Args:
        user_id: Id of the user completing onboarding.
        data: Onboarding fields (age, gender, weight_kg, height_cm,
            fitness_goal, experience_level, available_equipment, injuries,
            and optionally activity_level and timezone).

    Raises:
        UserServiceError: if no user exists with ``user_id``.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise UserServiceError("User not found")

    before = _profile_snapshot(user)
    activity_level = data.get("activity_level") or user.activity_level
    bmi = calculate_bmi(data["weight_kg"], data["height_cm"])
    tdee = calculate_tdee(
        weight_kg=data["weight_kg"],
        height_cm=data["height_cm"],
        age=data["age"],
        gender=data["gender"],
        activity_level=activity_level or DEFAULT_ACTIVITY_LEVEL,
    )

    updates: Dict[str, Any] = {
        "age": data["age"],
        "gender": data["gender"],
        "weight_kg": data["weight_kg"],
        "height_cm": data["height_cm"],
        "fitness_goal": data["fitness_goal"],
        "experience_level": data["experience_level"],
        "available_equipment": data.get("available_equipment") or [],
        "injuries": data.get("injuries") or [],
        "activity_level": activity_level,
        "bmi": bmi,
        "tdee": tdee,
        "onboarding_completed": True,
    }
    if data.get("timezone"):
        updates["timezone"] = data["timezone"]
    await user.update(updates)
    await audit.record_change(user_id, "profile", "onboarding", before, _profile_snapshot(user))
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
    """Apply a partial profile update, recomputing BMI/TDEE when relevant.

    Args:
        user_id: Id of the user to update.
        data: Fields to change (only provided keys are updated).

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

    # Recompute derived metrics if any of their inputs changed.
    weight = updates.get("weight_kg", user.weight_kg)
    height = updates.get("height_cm", user.height_cm)
    age = updates.get("age", user.age)
    gender = updates.get("gender", user.gender)
    activity_level = updates.get("activity_level", user.activity_level)
    if weight and height:
        updates["bmi"] = calculate_bmi(weight, height)
        if age and gender:
            updates["tdee"] = calculate_tdee(
                weight, height, age, gender, activity_level or DEFAULT_ACTIVITY_LEVEL
            )

    before = _profile_snapshot(user)
    await user.update(updates)
    await audit.record_change(user_id, "profile", "update", before, _profile_snapshot(user))
    if "weight_kg" in updates:
        await log_weight(user_id, updates["weight_kg"])
    logger.info("Updated profile for user %s", user_id)
    return user
