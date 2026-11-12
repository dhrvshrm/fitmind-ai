"""Request bodies for consent, the health profile, lab reports and supplements."""
from datetime import date
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.health.questionnaire import CONDITION_KEYS

ConsentScope = Literal["health_profile", "health_reports"]


class ConsentRequest(BaseModel):
    scope: ConsentScope


# Subscripting Literal with a tuple lists each key as an allowed value.
ConditionKey = Literal[CONDITION_KEYS]  # type: ignore[valid-type]


class ConditionIn(BaseModel):
    key: ConditionKey
    details: Dict[str, Any] = Field(default_factory=dict)


class HealthProfileIn(BaseModel):
    """The questionnaire answers. Empty lists and nulls mean "nothing to record"."""

    conditions: List[ConditionIn] = Field(default_factory=list, max_length=len(CONDITION_KEYS))
    other_conditions: Optional[str] = Field(default=None, max_length=300)
    medications: Optional[str] = Field(default=None, max_length=500)
    blood_thinners: Optional[bool] = None


class BiomarkerValueIn(BaseModel):
    """One value the user checked on the verification screen (or typed in)."""

    code: Optional[str] = Field(default=None, max_length=60)
    name: str = Field(min_length=1, max_length=120)
    value: float = Field(ge=0, le=100000)
    unit: str = Field(default="", max_length=40)
    measured_at: Optional[date] = None
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None


class ConfirmReportRequest(BaseModel):
    report_date: Optional[date] = None
    values: List[BiomarkerValueIn] = Field(default_factory=list, max_length=80)


Timing = Literal["morning", "with_breakfast", "with_lunch", "with_dinner", "pre_workout",
                 "post_workout", "evening", "bedtime", "any"]


class MacrosIn(BaseModel):
    calories: float = Field(ge=0, le=2000)
    protein: float = Field(ge=0, le=200)
    carbs: float = Field(default=0, ge=0, le=300)
    fats: float = Field(default=0, ge=0, le=200)


class UserSupplementIn(BaseModel):
    supplement_id: Optional[str] = Field(default=None, max_length=60)
    name: Optional[str] = Field(default=None, max_length=80)
    dose: str = Field(default="", max_length=60)
    timing: Timing = "any"
    reminder_time: Optional[str] = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    macros_per_serving: Optional[MacrosIn] = None
    notes: Optional[str] = Field(default=None, max_length=200)


class UserSupplementUpdate(BaseModel):
    dose: Optional[str] = Field(default=None, max_length=60)
    timing: Optional[Timing] = None
    reminder_time: Optional[str] = Field(default=None, pattern=r"^(([01]\d|2[0-3]):[0-5]\d)?$")
    macros_per_serving: Optional[MacrosIn] = None
    notes: Optional[str] = Field(default=None, max_length=200)
