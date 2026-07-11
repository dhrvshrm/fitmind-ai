import logging
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Name of the MongoDB collection backing recovery logs.
COLLECTION_NAME = "recovery_logs"

# In-memory fallback store used when MongoDB is unreachable. Keyed by log id.
_MEMORY_STORE: Dict[str, dict] = {}


class RecoveryLog:
    """A single daily recovery check-in for a user.

    Persists to MongoDB when a database connection is available and falls
    back to an in-memory store otherwise, mirroring the ``User`` model.
    """

    def __init__(
        self,
        user_id: str,
        sleep_hours: float,
        sleep_quality: int,
        stress_level: int,
        muscle_soreness: int,
        score: int,
        id: Optional[str] = None,
        log_date: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a recovery log, defaulting id/date/timestamp when omitted."""
        self.id: str = id or str(uuid4())
        self.user_id: str = user_id
        self.sleep_hours: float = sleep_hours
        self.sleep_quality: int = sleep_quality
        self.stress_level: int = stress_level
        self.muscle_soreness: int = muscle_soreness
        self.score: int = score
        # ISO date (YYYY-MM-DD) used to identify "today's" log.
        self.log_date: str = log_date or date.today().isoformat()
        self.created_at: datetime = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Serialise the log to a plain dict for storage."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "sleep_hours": self.sleep_hours,
            "sleep_quality": self.sleep_quality,
            "stress_level": self.stress_level,
            "muscle_soreness": self.muscle_soreness,
            "score": self.score,
            "log_date": self.log_date,
            "created_at": self.created_at,
        }

    @classmethod
    def _from_dict(cls, data: dict) -> "RecoveryLog":
        """Reconstruct a ``RecoveryLog`` from a stored dict."""
        return cls(
            user_id=data["user_id"],
            sleep_hours=data["sleep_hours"],
            sleep_quality=data["sleep_quality"],
            stress_level=data["stress_level"],
            muscle_soreness=data["muscle_soreness"],
            score=data["score"],
            id=data.get("id"),
            log_date=data.get("log_date"),
            created_at=data.get("created_at"),
        )

    async def save(self) -> "RecoveryLog":
        """Persist this log (upserting today's entry for the user).

        Re-logging on the same day overwrites that day's entry so a user has
        at most one recovery score per day.
        """
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].update_one(
                {"user_id": self.user_id, "log_date": self.log_date},
                {"$set": self.to_dict()},
                upsert=True,
            )
        else:
            self._memory_upsert()
        logger.info("Saved recovery log for user %s (%s)", self.user_id, self.log_date)
        return self

    def _memory_upsert(self) -> None:
        """Replace any existing same-day in-memory entry for this user."""
        for key, data in list(_MEMORY_STORE.items()):
            if data["user_id"] == self.user_id and data["log_date"] == self.log_date:
                del _MEMORY_STORE[key]
        _MEMORY_STORE[self.id] = self.to_dict()

    @classmethod
    async def get_latest_for_user(cls, user_id: str) -> Optional["RecoveryLog"]:
        """Return the user's most recent recovery log, or ``None``."""
        db = get_database()
        if db is not None:
            data = await db[COLLECTION_NAME].find_one(
                {"user_id": user_id}, sort=[("log_date", -1)]
            )
            return cls._from_dict(data) if data else None
        logs = [d for d in _MEMORY_STORE.values() if d["user_id"] == user_id]
        if not logs:
            return None
        return cls._from_dict(max(logs, key=lambda d: d["log_date"]))

    @classmethod
    async def get_history(cls, user_id: str, days: int = 14) -> List["RecoveryLog"]:
        """Return the user's recovery logs, newest first, capped at ``days``."""
        db = get_database()
        if db is not None:
            cursor = (
                db[COLLECTION_NAME]
                .find({"user_id": user_id})
                .sort("log_date", -1)
                .limit(days)
            )
            return [cls._from_dict(d) async for d in cursor]
        logs = [d for d in _MEMORY_STORE.values() if d["user_id"] == user_id]
        logs.sort(key=lambda d: d["log_date"], reverse=True)
        return [cls._from_dict(d) for d in logs[:days]]
