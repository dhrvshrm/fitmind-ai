from typing import Any, Dict, List

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    """A single notification returned to the client."""

    id: str
    type: str
    message: str
    meta: Dict[str, Any] = {}
    read: bool
    created_at: str


class NotificationListResponse(BaseModel):
    """A list of notifications plus the unread count."""

    notifications: List[NotificationResponse]
    unread_count: int
