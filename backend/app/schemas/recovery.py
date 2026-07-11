from typing import List

from pydantic import BaseModel, Field


class RecoveryLogRequest(BaseModel):
    """Payload for logging a daily recovery check-in.

    Quality/stress/soreness use a 1-5 scale; sleep_hours is in hours.
    """

    sleep_hours: float = Field(..., ge=0, le=24)
    sleep_quality: int = Field(..., ge=1, le=5)
    stress_level: int = Field(..., ge=1, le=5)
    muscle_soreness: int = Field(..., ge=1, le=5)


class RecoveryLogResponse(BaseModel):
    """Response returned after logging recovery."""

    recovery_score: int
    recommendation: str


class RecoveryScoreResponse(BaseModel):
    """Response for today's recovery score."""

    score: int
    recommendation: str
    explanation: str


class RecoveryHistoryItem(BaseModel):
    """A single day's score in the recovery history."""

    date: str
    score: int


class RecoveryHistoryResponse(BaseModel):
    """Response for the recovery history endpoint."""

    history: List[RecoveryHistoryItem]
