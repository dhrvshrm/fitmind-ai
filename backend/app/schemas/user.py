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


class UserOnboarding(BaseModel):
    """Payload collected during user onboarding."""

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
