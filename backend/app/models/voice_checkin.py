import logging
from datetime import date, datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Name of the MongoDB collection backing voice check-ins.
COLLECTION_NAME = "voice_checkins"

# In-memory fallback store used when MongoDB is unreachable. Keyed by id.
_MEMORY_STORE: Dict[str, dict] = {}


class VoiceCheckin:
    """A voice-based daily check-in: audio, transcript and detected mood.

    Persists to MongoDB when available and falls back to an in-memory store
    otherwise, mirroring the other models.
    """

    def __init__(
        self,
        user_id: str,
        transcript: str,
        mood: str,
        energy_level: int,
        audio_url: Optional[str] = None,
        id: Optional[str] = None,
        log_date: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a check-in, defaulting id/date/timestamp when omitted."""
        self.id: str = id or str(uuid4())
        self.user_id: str = user_id
        self.audio_url: Optional[str] = audio_url
        self.transcript: str = transcript
        self.mood: str = mood
        self.energy_level: int = energy_level
        self.log_date: str = log_date or date.today().isoformat()
        self.created_at: datetime = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Serialise the check-in to a plain dict for storage."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "audio_url": self.audio_url,
            "transcript": self.transcript,
            "mood": self.mood,
            "energy_level": self.energy_level,
            "log_date": self.log_date,
            "created_at": self.created_at,
        }

    @classmethod
    def _from_dict(cls, data: dict) -> "VoiceCheckin":
        """Reconstruct a ``VoiceCheckin`` from a stored dict."""
        return cls(
            user_id=data["user_id"],
            transcript=data["transcript"],
            mood=data["mood"],
            energy_level=data["energy_level"],
            audio_url=data.get("audio_url"),
            id=data.get("id"),
            log_date=data.get("log_date"),
            created_at=data.get("created_at"),
        )

    async def save(self) -> "VoiceCheckin":
        """Persist this check-in (append-only; multiple per day allowed)."""
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].insert_one(self.to_dict())
        else:
            _MEMORY_STORE[self.id] = self.to_dict()
        logger.info("Saved voice check-in for user %s", self.user_id)
        return self

    @classmethod
    async def get_history(cls, user_id: str, limit: int = 30) -> List["VoiceCheckin"]:
        """Return the user's check-ins, newest first, capped at ``limit``."""
        db = get_database()
        if db is not None:
            cursor = (
                db[COLLECTION_NAME]
                .find({"user_id": user_id})
                .sort("created_at", -1)
                .limit(limit)
            )
            return [cls._from_dict(d) async for d in cursor]
        logs = [d for d in _MEMORY_STORE.values() if d["user_id"] == user_id]
        logs.sort(key=lambda d: d["created_at"], reverse=True)
        return [cls._from_dict(d) for d in logs[:limit]]
