import logging
from datetime import date as date_cls
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Collection + in-memory fallback for body-weight logs.
COLLECTION_NAME = "weight_logs"
_MEMORY_STORE: Dict[str, dict] = {}


class WeightLog:
    """A recorded body-weight measurement for a user on a given day."""

    def __init__(
        self,
        user_id: str,
        weight_kg: float,
        id: Optional[str] = None,
        log_date: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a weight log, defaulting id/date/timestamp when omitted."""
        self.id: str = id or str(uuid4())
        self.user_id: str = user_id
        self.weight_kg: float = weight_kg
        self.log_date: str = log_date or date_cls.today().isoformat()
        self.created_at: datetime = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Serialise the weight log for storage."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "weight_kg": self.weight_kg,
            "log_date": self.log_date,
            "created_at": self.created_at,
        }

    @classmethod
    def _from_dict(cls, data: dict) -> "WeightLog":
        """Reconstruct a ``WeightLog`` from a stored dict."""
        return cls(
            user_id=data["user_id"],
            weight_kg=data["weight_kg"],
            id=data.get("id"),
            log_date=data.get("log_date"),
            created_at=data.get("created_at"),
        )

    async def save(self) -> "WeightLog":
        """Persist this log, upserting the entry for the day (one per day)."""
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].update_one(
                {"user_id": self.user_id, "log_date": self.log_date},
                {"$set": self.to_dict()},
                upsert=True,
            )
        else:
            for key, data in list(_MEMORY_STORE.items()):
                if data["user_id"] == self.user_id and data["log_date"] == self.log_date:
                    del _MEMORY_STORE[key]
            _MEMORY_STORE[self.id] = self.to_dict()
        return self

    @classmethod
    async def get_history(cls, user_id: str, days: int = 90) -> List["WeightLog"]:
        """Return the user's weight logs, oldest first, capped at ``days`` entries."""
        db = get_database()
        if db is not None:
            cursor = (
                db[COLLECTION_NAME]
                .find({"user_id": user_id})
                .sort("log_date", -1)
                .limit(days)
            )
            logs = [cls._from_dict(d) async for d in cursor]
            return list(reversed(logs))
        logs = [d for d in _MEMORY_STORE.values() if d["user_id"] == user_id]
        logs.sort(key=lambda d: d["log_date"])
        return [cls._from_dict(d) for d in logs[-days:]]


async def log_weight(user_id: str, weight_kg: float) -> WeightLog:
    """Record a user's body weight for today (upserting the day's entry)."""
    return await WeightLog(user_id, weight_kg).save()
