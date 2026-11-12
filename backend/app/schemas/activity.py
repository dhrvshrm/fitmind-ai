from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.activity.steps import MAX_DAILY_STEPS, MAX_STEP_TARGET, MIN_STEP_TARGET

# "HH:MM", 24-hour, local time.
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"


class StepsLogRequest(BaseModel):
    """The step count for one day (replaces any earlier entry for that day)."""

    steps: int = Field(..., ge=0, le=MAX_DAILY_STEPS)


class ActivitySettingsUpdate(BaseModel):
    """Partial update; only provided fields change.

    ``step_target`` null with ``reset_step_target`` true goes back to the default.
    """

    step_target: Optional[int] = Field(None, ge=MIN_STEP_TARGET, le=MAX_STEP_TARGET)
    reset_step_target: bool = False
    break_reminders_enabled: Optional[bool] = None
    work_start: Optional[str] = Field(None, pattern=TIME_PATTERN)
    work_end: Optional[str] = Field(None, pattern=TIME_PATTERN)
    break_interval_minutes: Optional[int] = Field(None, ge=15, le=240)
    # Monday = 0 ... Sunday = 6.
    work_days: Optional[List[int]] = Field(None, max_length=7)

    @field_validator("work_days")
    @classmethod
    def _valid_days(cls, value: Optional[List[int]]) -> Optional[List[int]]:
        if value is None:
            return value
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("work days are 0 (Monday) to 6 (Sunday)")
        return sorted(set(value))
