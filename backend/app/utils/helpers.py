"""Fitness-related calculation helpers."""

# Activity multipliers applied to BMR to estimate total daily energy
# expenditure (TDEE). Keyed by self-reported activity level.
ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}


def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    """Return the Body Mass Index rounded to one decimal place.

    Args:
        weight_kg: Body weight in kilograms.
        height_cm: Height in centimetres.

    Raises:
        ValueError: if height is not positive.
    """
    if height_cm <= 0:
        raise ValueError("height_cm must be greater than 0")
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)


def calculate_tdee(
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: str,
    activity_level: str = "moderate",
) -> int:
    """Estimate Total Daily Energy Expenditure in calories.

    Uses the Mifflin-St Jeor equation for BMR, then applies an activity
    multiplier. Defaults to a "moderate" activity level.

    Args:
        weight_kg: Body weight in kilograms.
        height_cm: Height in centimetres.
        age: Age in years.
        gender: "male" / "female" (any other value uses the female offset).
        activity_level: One of ``ACTIVITY_MULTIPLIERS`` keys.
    """
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age
    bmr += 5 if gender.strip().lower() in ("male", "m") else -161
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, ACTIVITY_MULTIPLIERS["moderate"])
    return int(round(bmr * multiplier))
