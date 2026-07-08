import logging
from datetime import datetime, timezone
from typing import Dict, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Name of the MongoDB collection backing users.
COLLECTION_NAME = "users"

# In-memory fallback store used until MongoDB is wired up (Day 5) or when the
# database is unreachable. Keyed by user id.
_MEMORY_STORE: Dict[str, dict] = {}


class User:
    """Domain model for an application user.

    Provides async CRUD helpers that persist to MongoDB when a database
    connection is available, and transparently fall back to an in-memory
    store otherwise so authentication works before the database exists.
    """

    def __init__(
        self,
        email: str,
        password_hash: str,
        username: Optional[str] = None,
        id: Optional[str] = None,
        xp: int = 0,
        level: int = 1,
        created_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a user, generating an id and username when omitted."""
        self.id: str = id or str(uuid4())
        self.email: str = email
        self.password_hash: str = password_hash
        self.username: str = username or email.split("@")[0]
        self.xp: int = xp
        self.level: int = level
        self.created_at: datetime = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Serialise the user to a plain dict for storage."""
        return {
            "id": self.id,
            "email": self.email,
            "password_hash": self.password_hash,
            "username": self.username,
            "xp": self.xp,
            "level": self.level,
            "created_at": self.created_at,
        }

    def public_dict(self) -> dict:
        """Serialise the user without sensitive fields (safe for responses)."""
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "xp": self.xp,
            "level": self.level,
        }

    @classmethod
    def _from_dict(cls, data: dict) -> "User":
        """Reconstruct a ``User`` instance from a stored dict."""
        return cls(
            email=data["email"],
            password_hash=data["password_hash"],
            username=data.get("username"),
            id=data.get("id"),
            xp=data.get("xp", 0),
            level=data.get("level", 1),
            created_at=data.get("created_at"),
        )

    async def save(self) -> "User":
        """Persist this user, inserting it into the active store."""
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].insert_one(self.to_dict())
        else:
            _MEMORY_STORE[self.id] = self.to_dict()
        logger.info("Persisted user %s", self.email)
        return self

    @classmethod
    async def get_by_email(cls, email: str) -> Optional["User"]:
        """Return the user with the given email, or ``None`` if not found."""
        db = get_database()
        if db is not None:
            data = await db[COLLECTION_NAME].find_one({"email": email})
            return cls._from_dict(data) if data else None
        for data in _MEMORY_STORE.values():
            if data["email"] == email:
                return cls._from_dict(data)
        return None

    @classmethod
    async def get_by_id(cls, user_id: str) -> Optional["User"]:
        """Return the user with the given id, or ``None`` if not found."""
        db = get_database()
        if db is not None:
            data = await db[COLLECTION_NAME].find_one({"id": user_id})
            return cls._from_dict(data) if data else None
        data = _MEMORY_STORE.get(user_id)
        return cls._from_dict(data) if data else None
