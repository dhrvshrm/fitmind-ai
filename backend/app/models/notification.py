import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Collection + in-memory fallback for notifications.
COLLECTION_NAME = "notifications"
_MEMORY_STORE: Dict[str, dict] = {}


class Notification:
    """A user-facing notification, delivered live via WebSocket or on reconnect."""

    def __init__(
        self,
        user_id: str,
        type: str,
        message: str,
        meta: Optional[Dict[str, Any]] = None,
        read: bool = False,
        delivered: bool = False,
        id: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a notification, defaulting id/timestamp when omitted."""
        self.id: str = id or str(uuid4())
        self.user_id: str = user_id
        self.type: str = type
        self.message: str = message
        self.meta: Dict[str, Any] = meta or {}
        self.read: bool = read
        self.delivered: bool = delivered
        self.created_at: datetime = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Serialise the notification for storage."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "message": self.message,
            "meta": self.meta,
            "read": self.read,
            "delivered": self.delivered,
            "created_at": self.created_at,
        }

    def public_dict(self) -> dict:
        """Serialise the notification for API/WebSocket delivery."""
        data = self.to_dict()
        data["created_at"] = self.created_at.isoformat()
        return data

    @classmethod
    def _from_dict(cls, data: dict) -> "Notification":
        """Reconstruct a ``Notification`` from a stored dict."""
        return cls(
            user_id=data["user_id"],
            type=data["type"],
            message=data["message"],
            meta=data.get("meta"),
            read=data.get("read", False),
            delivered=data.get("delivered", False),
            id=data.get("id"),
            created_at=data.get("created_at"),
        )

    async def save(self) -> "Notification":
        """Persist this notification (append-only)."""
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].insert_one(self.to_dict())
        else:
            _MEMORY_STORE[self.id] = self.to_dict()
        logger.info("Saved notification '%s' for user %s", self.type, self.user_id)
        return self

    @classmethod
    async def get_for_user(cls, user_id: str, limit: int = 50) -> List["Notification"]:
        """Return the user's notifications, newest first."""
        db = get_database()
        if db is not None:
            cursor = (
                db[COLLECTION_NAME]
                .find({"user_id": user_id})
                .sort("created_at", -1)
                .limit(limit)
            )
            return [cls._from_dict(d) async for d in cursor]
        items = [d for d in _MEMORY_STORE.values() if d["user_id"] == user_id]
        items.sort(key=lambda d: d["created_at"], reverse=True)
        return [cls._from_dict(d) for d in items[:limit]]

    @classmethod
    async def get_undelivered(cls, user_id: str) -> List["Notification"]:
        """Return the user's undelivered notifications, oldest first."""
        db = get_database()
        if db is not None:
            cursor = (
                db[COLLECTION_NAME]
                .find({"user_id": user_id, "delivered": False})
                .sort("created_at", 1)
            )
            return [cls._from_dict(d) async for d in cursor]
        items = [
            d
            for d in _MEMORY_STORE.values()
            if d["user_id"] == user_id and not d["delivered"]
        ]
        items.sort(key=lambda d: d["created_at"])
        return [cls._from_dict(d) for d in items]

    @classmethod
    async def mark_delivered(cls, notification_ids: List[str]) -> None:
        """Mark the given notifications as delivered."""
        if not notification_ids:
            return
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].update_many(
                {"id": {"$in": notification_ids}}, {"$set": {"delivered": True}}
            )
        else:
            for nid in notification_ids:
                if nid in _MEMORY_STORE:
                    _MEMORY_STORE[nid]["delivered"] = True

    @classmethod
    async def mark_read(cls, user_id: str, notification_id: str) -> bool:
        """Mark a single notification read. Returns True if it exists for this user.

        Uses ``matched_count`` rather than ``modified_count``: Mongo doesn't
        count a `$set` that doesn't change the value as "modified", so an
        already-read notification would otherwise look like a 404 on repeat
        calls (e.g. double-clicking, or re-opening the drawer) even though it
        exists and belongs to the user.
        """
        db = get_database()
        if db is not None:
            result = await db[COLLECTION_NAME].update_one(
                {"id": notification_id, "user_id": user_id}, {"$set": {"read": True}}
            )
            return result.matched_count > 0
        item = _MEMORY_STORE.get(notification_id)
        if item and item["user_id"] == user_id:
            item["read"] = True
            return True
        return False

    @classmethod
    async def unread_count(cls, user_id: str) -> int:
        """Return the number of unread notifications for the user."""
        db = get_database()
        if db is not None:
            return await db[COLLECTION_NAME].count_documents(
                {"user_id": user_id, "read": False}
            )
        return sum(
            1
            for d in _MEMORY_STORE.values()
            if d["user_id"] == user_id and not d["read"]
        )
