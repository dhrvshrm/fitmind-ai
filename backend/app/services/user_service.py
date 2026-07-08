import logging
from typing import Any, Dict

from app.models.user import User
from app.utils.helpers import calculate_bmi, calculate_tdee

logger = logging.getLogger(__name__)


class UserServiceError(Exception):
    """Raised when a user-service operation fails (e.g. user not found)."""
    


async def complete_onboarding(user_id: str, data: Dict[str, Any]) -> User:
    """Complete a user's onboarding: store profile fields and derived metrics.

    Computes BMI and TDEE from the supplied measurements, marks onboarding as
    completed, and persists everything to MongoDB.

    Args:
        user_id: Id of the user completing onboarding.
        data: Onboarding fields (age, gender, weight_kg, height_cm,
            fitness_goal, experience_level, available_equipment).

    Raises:
        UserServiceError: if no user exists with ``user_id``.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise UserServiceError("User not found")

    bmi = calculate_bmi(data["weight_kg"], data["height_cm"])
    tdee = calculate_tdee(
        weight_kg=data["weight_kg"],
        height_cm=data["height_cm"],
        age=data["age"],
        gender=data["gender"],
    )

    await user.update(
        {
            "age": data["age"],
            "gender": data["gender"],
            "weight_kg": data["weight_kg"],
            "height_cm": data["height_cm"],
            "fitness_goal": data["fitness_goal"],
            "experience_level": data["experience_level"],
            "available_equipment": data["available_equipment"],
            "bmi": bmi,
            "tdee": tdee,
            "onboarding_completed": True,
        }
    )
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
        UserServiceError: if no user exists with ``user_id``.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise UserServiceError("User not found")

    updates: Dict[str, Any] = {k: v for k, v in data.items() if v is not None}

    # Recompute derived metrics if any of their inputs changed.
    weight = updates.get("weight_kg", user.weight_kg)
    height = updates.get("height_cm", user.height_cm)
    age = updates.get("age", user.age)
    gender = updates.get("gender", user.gender)
    if weight and height:
        updates["bmi"] = calculate_bmi(weight, height)
        if age and gender:
            updates["tdee"] = calculate_tdee(weight, height, age, gender)

    await user.update(updates)
    logger.info("Updated profile for user %s", user_id)
    return user
