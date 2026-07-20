from typing import List, Optional

from pydantic import BaseModel, Field


class AwardXpRequest(BaseModel):
    """Payload for manually awarding XP to a user."""

    amount: int = Field(..., gt=0, le=1000)


class BadgeSchema(BaseModel):
    """Public metadata for a badge."""

    id: str
    name: str
    description: str


class GamificationProfileResponse(BaseModel):
    """The user's XP, level, streak and earned badges."""

    xp: int
    level: int
    title: str
    next_title: Optional[str] = None
    xp_into_level: int
    xp_to_next: int
    current_streak: int
    longest_streak: int
    badges: List[BadgeSchema]
    badge_count: int
