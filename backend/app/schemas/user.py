from pydantic import BaseModel, EmailStr
from typing import List, Optional


class UserRegister(BaseModel):
    """Payload for registering a new user."""

    email: EmailStr
    password: str


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

    age: int
    gender: str
    weight_kg: float
    height_cm: float
    fitness_goal: str
    experience_level: str
    available_equipment: List[str]


class UserProfileUpdate(BaseModel):
    """Partial profile update - every field is optional."""

    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    fitness_goal: Optional[str] = None
    experience_level: Optional[str] = None
    available_equipment: Optional[List[str]] = None
