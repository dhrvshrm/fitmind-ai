from typing import Optional

from pydantic import BaseModel, Field


class ProfileUpdateRequest(BaseModel):
    """Editable profile fields — all optional (partial update)."""

    username: Optional[str] = Field(None, min_length=1, max_length=40)
    age: Optional[int] = Field(None, ge=1, le=120)
    weight_kg: Optional[float] = Field(None, gt=0, le=500)
    height_cm: Optional[float] = Field(None, gt=0, le=300)
    fitness_goal: Optional[str] = None


class GoalsUpdateRequest(BaseModel):
    """Fitness-goal fields — all optional (partial update)."""

    fitness_goal: Optional[str] = None
    experience_level: Optional[str] = None
    available_equipment: Optional[list] = None


class NotificationPreferencesUpdate(BaseModel):
    """Per-type notification opt-ins — all optional (only provided keys change)."""

    follow: Optional[bool] = None
    friend_request: Optional[bool] = None
    nudge: Optional[bool] = None
    weekly_report: Optional[bool] = None
    badge_earned: Optional[bool] = None
    streak_warning: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    """Payload for changing the current user's password."""

    current_password: str
    new_password: str = Field(..., min_length=8)
