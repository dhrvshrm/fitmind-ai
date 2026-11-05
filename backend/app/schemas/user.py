from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.utils.time import is_valid_timezone

# Allowed values for the self-reported activity level (see ACTIVITY_MULTIPLIERS).
ActivityLevel = Literal["sedentary", "light", "moderate", "active", "very_active"]
Gender = Literal["male", "female", "other"]

MAX_LIST_ITEMS = 20
MAX_ITEM_LENGTH = 60


def _clean_list(values: Optional[List[str]]) -> Optional[List[str]]:
    """Trim, de-duplicate (ignoring case) and bound a free-text list (equipment, injuries)."""
    if values is None:
        return None
    unique: dict = {}
    for value in values:
        cleaned = (value or "").strip()[:MAX_ITEM_LENGTH]
        if cleaned:
            unique.setdefault(cleaned.lower(), cleaned)
    return list(unique.values())[:MAX_LIST_ITEMS]


def _check_timezone(value: Optional[str]) -> Optional[str]:
    """Reject strings that aren't IANA timezone names."""
    if value is not None and not is_valid_timezone(value):
        raise ValueError("must be an IANA timezone such as Asia/Kolkata")
    return value


class UserRegister(BaseModel):
    """Payload for registering a new user."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    """Payload for logging in an existing user."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public representation of a user (never includes the password hash)."""

    id: str
    email: EmailStr
    username: str
    xp: int = 0
    level: int = 1


# --- Personalisation (onboarding v2) ----------------------------------------
# Every answer is optional: None means "not answered", never "no".

GoalPace = Literal["gentle", "moderate", "aggressive"]
ReproductiveStatus = Literal["none", "pregnant", "breastfeeding", "unknown"]
WorkoutTime = Literal["early_morning", "morning", "afternoon", "evening", "night", "varies"]
DietType = Literal["vegetarian", "eggetarian", "non_vegetarian", "vegan", "jain"]
Cook = Literal["self", "family", "cook", "mess_or_canteen", "mixed"]
EatOutFrequency = Literal["rarely", "weekly", "few_times_a_week", "daily"]
WorkSchedule = Literal["day", "night_shift", "rotating_shifts", "student", "at_home", "other"]


class FoodPreferences(BaseModel):
    diet_type: Optional[DietType] = None
    eats_eggs: Optional[bool] = None
    eats_dairy: Optional[bool] = None
    allergies: Optional[List[str]] = None
    intolerances: Optional[List[str]] = None
    likes: Optional[List[str]] = None
    dislikes: Optional[List[str]] = None
    excluded: Optional[List[str]] = None
    cuisines: Optional[List[str]] = None

    _clean = field_validator(
        "allergies", "intolerances", "likes", "dislikes", "excluded", "cuisines"
    )(_clean_list)


class FoodAccess(BaseModel):
    pantry: Optional[List[str]] = None
    who_cooks: Optional[Cook] = None
    eats_out: Optional[EatOutFrequency] = None
    daily_budget_inr: Optional[int] = Field(None, ge=0, le=10000)
    open_to_new_ingredients: Optional[bool] = None
    region: Optional[str] = Field(None, max_length=60)

    _clean = field_validator("pantry")(_clean_list)


class Lifestyle(BaseModel):
    wake_time: Optional[str] = Field(None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    sleep_time: Optional[str] = Field(None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    work_schedule: Optional[WorkSchedule] = None
    meals_per_day: Optional[int] = Field(None, ge=1, le=8)
    water_glasses_per_day: Optional[int] = Field(None, ge=0, le=30)


class GoalDetails(BaseModel):
    """Goal, pace and body details used for targets (all optional beyond the basics)."""

    goal_pace: Optional[GoalPace] = None
    target_weight_kg: Optional[float] = Field(None, ge=30, le=300)
    body_fat_percent: Optional[float] = Field(None, ge=3, le=60)
    reproductive_status: Optional[ReproductiveStatus] = None
    workout_days_per_week: Optional[int] = Field(None, ge=0, le=7)
    workout_time: Optional[WorkoutTime] = None


class PersonalisationUpdate(GoalDetails):
    """Partial update of the personalisation sections; omitted sections are untouched."""

    food_preferences: Optional[FoodPreferences] = None
    food_access: Optional[FoodAccess] = None
    lifestyle: Optional[Lifestyle] = None


class TargetsPreviewRequest(GoalDetails):
    """Inputs for previewing targets before they're saved (onboarding review step)."""

    age: int = Field(..., ge=13, le=100)
    gender: Gender
    weight_kg: float = Field(..., ge=30, le=300)
    height_cm: float = Field(..., ge=100, le=250)
    fitness_goal: str = Field(..., min_length=1, max_length=40)
    activity_level: Optional[ActivityLevel] = None


class UserOnboarding(PersonalisationUpdate):
    """Payload collected during user onboarding (v2 sections optional)."""

    age: int = Field(..., ge=13, le=100)
    gender: Gender
    weight_kg: float = Field(..., ge=30, le=300)
    height_cm: float = Field(..., ge=100, le=250)
    fitness_goal: str = Field(..., min_length=1, max_length=40)
    experience_level: str = Field(..., min_length=1, max_length=40)
    available_equipment: List[str] = Field(default_factory=list)
    injuries: List[str] = Field(default_factory=list)
    activity_level: Optional[ActivityLevel] = None
    timezone: Optional[str] = None

    _clean_lists = field_validator("available_equipment", "injuries")(_clean_list)
    _valid_timezone = field_validator("timezone")(_check_timezone)


class UserProfileUpdate(BaseModel):
    """Partial profile update - every field is optional."""

    age: Optional[int] = Field(None, ge=13, le=100)
    gender: Optional[Gender] = None
    weight_kg: Optional[float] = Field(None, ge=30, le=300)
    height_cm: Optional[float] = Field(None, ge=100, le=250)
    fitness_goal: Optional[str] = Field(None, min_length=1, max_length=40)
    experience_level: Optional[str] = Field(None, min_length=1, max_length=40)
    available_equipment: Optional[List[str]] = None
    injuries: Optional[List[str]] = None
    activity_level: Optional[ActivityLevel] = None
    timezone: Optional[str] = None

    _clean_lists = field_validator("available_equipment", "injuries")(_clean_list)
    _valid_timezone = field_validator("timezone")(_check_timezone)
