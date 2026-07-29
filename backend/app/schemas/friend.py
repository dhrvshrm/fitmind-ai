from typing import List, Optional

from pydantic import BaseModel, model_validator


class FriendRequestCreate(BaseModel):
    """Payload for sending a friend request - by user id or username."""

    to_user_id: Optional[str] = None
    to_username: Optional[str] = None

    @model_validator(mode="after")
    def _require_one(self) -> "FriendRequestCreate":
        """Ensure exactly one recipient identifier is provided."""
        if not (self.to_user_id or self.to_username):
            raise ValueError("Provide either to_user_id or to_username")
        return self


class FriendResponse(BaseModel):
    """Public representation of a friend."""

    id: str
    username: str
    level: int
    xp: int
    current_streak: int


class LeaderboardEntry(BaseModel):
    """A single row in the weekly leaderboard."""

    rank: int
    user_id: str
    username: str
    weekly_xp: int
    level: int
    is_me: bool


class LeaderboardResponse(BaseModel):
    """The weekly leaderboard of a user and their friends."""

    leaderboard: List[LeaderboardEntry]


class FriendRequestItem(BaseModel):
    """A pending friend request addressed to the current user."""

    request_id: str
    user_id: str
    username: str
    level: int
    created_at: str


class FriendRequestListResponse(BaseModel):
    """Pending incoming friend requests."""

    requests: List[FriendRequestItem]
