import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Collection + in-memory fallback for weekly reports.
COLLECTION_NAME = "weekly_reports"
_MEMORY_STORE: Dict[str, dict] = {}


class WeeklyReport:
    """An AI-generated weekly recap of a user's fitness activity."""

    def __init__(
        self,
        user_id: str,
        week_start: str,
        week_end: str,
        stats: Dict[str, Any],
        content: str,
        highlight: str,
        id: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a report, defaulting id/timestamp when omitted.

        ``stats`` holds the aggregated numbers (workouts, calories, trends,
        xp) so the model stays flexible as metrics evolve.
        """
        self.id: str = id or str(uuid4())
        self.user_id: str = user_id
        self.week_start: str = week_start
        self.week_end: str = week_end
        self.stats: Dict[str, Any] = stats
        self.content: str = content
        self.highlight: str = highlight
        self.created_at: datetime = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Serialise the report for storage."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "week_start": self.week_start,
            "week_end": self.week_end,
            "stats": self.stats,
            "content": self.content,
            "highlight": self.highlight,
            "created_at": self.created_at,
        }

    def public_dict(self) -> dict:
        """Flatten the report for API responses (stats hoisted to top level)."""
        return {
            "id": self.id,
            "week_start": self.week_start,
            "week_end": self.week_end,
            **self.stats,
            "content": self.content,
            "highlight": self.highlight,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def _from_dict(cls, data: dict) -> "WeeklyReport":
        """Reconstruct a ``WeeklyReport`` from a stored dict."""
        return cls(
            user_id=data["user_id"],
            week_start=data["week_start"],
            week_end=data["week_end"],
            stats=data.get("stats", {}),
            content=data.get("content", ""),
            highlight=data.get("highlight", ""),
            id=data.get("id"),
            created_at=data.get("created_at"),
        )

    async def save(self) -> "WeeklyReport":
        """Persist this report (append-only)."""
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].insert_one(self.to_dict())
        else:
            _MEMORY_STORE[self.id] = self.to_dict()
        logger.info("Saved weekly report for user %s", self.user_id)
        return self

    @classmethod
    async def get_by_id(cls, report_id: str) -> Optional["WeeklyReport"]:
        """Return a report by id, or ``None``."""
        db = get_database()
        if db is not None:
            data = await db[COLLECTION_NAME].find_one({"id": report_id})
            return cls._from_dict(data) if data else None
        data = _MEMORY_STORE.get(report_id)
        return cls._from_dict(data) if data else None

    @classmethod
    async def get_for_user(cls, user_id: str, limit: int = 52) -> List["WeeklyReport"]:
        """Return the user's reports, newest first."""
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
    async def get_latest(cls, user_id: str) -> Optional["WeeklyReport"]:
        """Return the user's most recent report, or ``None``."""
        reports = await cls.get_for_user(user_id, limit=1)
        return reports[0] if reports else None
