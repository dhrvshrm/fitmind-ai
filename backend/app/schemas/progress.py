from datetime import date as Date
from typing import Optional

from pydantic import BaseModel, Field


class WeightLogRequest(BaseModel):
    weight_kg: float = Field(..., ge=30, le=300)
    date: Optional[Date] = None


class MeasurementRequest(BaseModel):
    waist_cm: Optional[float] = Field(None, ge=40, le=250)
    hip_cm: Optional[float] = Field(None, ge=50, le=250)
    date: Optional[Date] = None


class AcceptTargetRequest(BaseModel):
    calories: int = Field(..., ge=1000, le=6000)


class FlexibleDayRequest(BaseModel):
    date: Date
    reason: str = Field("weekend", max_length=20)
    extra_kcal: Optional[int] = Field(None, ge=100, le=1000)
    note: Optional[str] = Field(None, max_length=80)


class ChallengeCreateRequest(BaseModel):
    friend_id: str = Field(..., min_length=1, max_length=64)
    kind: str = Field(..., min_length=1, max_length=40)
