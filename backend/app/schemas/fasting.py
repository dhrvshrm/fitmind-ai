from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator
from pydantic_core import PydanticCustomError

FastingModeKey = Literal["navratri", "ekadashi", "paryushan", "ramadan"]

# "HH:MM", 24-hour, local time.
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"


class FastingModeCreate(BaseModel):
    """Switch a fasting or festival mode on for dates the user picks.

    ``end_date`` defaults to the mode's usual length (one day for Ekadashi).
    For Ramadan, ``dawn_time`` and ``sunset_time`` are the user's local
    sehri cut-off and iftar times; defaults are used when they're left out.
    """

    mode: FastingModeKey
    start_date: date
    end_date: Optional[date] = None
    dawn_time: Optional[str] = Field(None, pattern=TIME_PATTERN)
    sunset_time: Optional[str] = Field(None, pattern=TIME_PATTERN)

    @model_validator(mode="after")
    def _check(self) -> "FastingModeCreate":
        if self.end_date is not None and self.end_date < self.start_date:
            raise PydanticCustomError("value_error", "The end date can't be before the start date")
        if self.mode != "ramadan" and (self.dawn_time or self.sunset_time):
            raise PydanticCustomError("value_error", "Dawn and sunset times are only used for Ramadan")
        if self.dawn_time and self.sunset_time and self.dawn_time >= self.sunset_time:
            raise PydanticCustomError("value_error", "Dawn has to come before sunset")
        return self
