import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Name of the MongoDB collection backing users.
COLLECTION_NAME = "users"

# Profile fields set during onboarding / profile updates. Kept in one place so
# storage, updates, and public serialisation stay in sync.
PROFILE_FIELDS = (
    "age",
    "gender",
    "weight_kg",
    "height_cm",
    "fitness_goal",
    "experience_level",
    "available_equipment",
    "bmi",
    "tdee",
    "onboarding_completed",
)

# In-memory fallback store used when MongoDB is unreachable. Keyed by user id.
_MEMORY_STORE: Dict[str, dict] = {}


class User:
    """Domain model for an application user.

    Provides async CRUD helpers that persist to MongoDB when a database
    connection is available, and transparently fall back to an in-memory
    store otherwise so the app works before/without the database.
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
        updated_at: Optional[datetime] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        weight_kg: Optional[float] = None,
        height_cm: Optional[float] = None,
        fitness_goal: Optional[str] = None,
        experience_level: Optional[str] = None,
        available_equipment: Optional[List[str]] = None,
        bmi: Optional[float] = None,
        tdee: Optional[int] = None,
        onboarding_completed: bool = False,
    ) -> None:
        """Initialise a user, generating an id and username when omitted."""
        self.id: str = id or str(uuid4())
        self.email: str = email
        self.password_hash: str = password_hash
        self.username: str = username or email.split("@")[0]
        self.xp: int = xp
        self.level: int = level
        self.created_at: datetime = created_at or datetime.now(timezone.utc)
        self.updated_at: Optional[datetime] = updated_at

        # Profile / onboarding fields (populated on Day 3).
        self.age: Optional[int] = age
        self.gender: Optional[str] = gender
        self.weight_kg: Optional[float] = weight_kg
        self.height_cm: Optional[float] = height_cm
        self.fitness_goal: Optional[str] = fitness_goal
        self.experience_level: Optional[str] = experience_level
        self.available_equipment: List[str] = available_equipment or []
        self.bmi: Optional[float] = bmi
        self.tdee: Optional[int] = tdee
        self.onboarding_completed: bool = onboarding_completed

    def to_dict(self) -> dict:
        """Serialise the full user (including profile) for storage."""
        return {
            "id": self.id,
            "email": self.email,
            "password_hash": self.password_hash,
            "username": self.username,
            "xp": self.xp,
            "level": self.level,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "age": self.age,
            "gender": self.gender,
            "weight_kg": self.weight_kg,
            "height_cm": self.height_cm,
            "fitness_goal": self.fitness_goal,
            "experience_level": self.experience_level,
            "available_equipment": self.available_equipment,
            "bmi": self.bmi,
            "tdee": self.tdee,
            "onboarding_completed": self.onboarding_completed,
        }

    def public_dict(self) -> dict:
        """Serialise the user without sensitive fields (safe for responses)."""
        data = self.to_dict()
        data.pop("password_hash", None)
        return data

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
            updated_at=data.get("updated_at"),
            age=data.get("age"),
            gender=data.get("gender"),
            weight_kg=data.get("weight_kg"),
            height_cm=data.get("height_cm"),
            fitness_goal=data.get("fitness_goal"),
            experience_level=data.get("experience_level"),
            available_equipment=data.get("available_equipment"),
            bmi=data.get("bmi"),
            tdee=data.get("tdee"),
            onboarding_completed=data.get("onboarding_completed", False),
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

    async def update(self, fields: Dict[str, Any]) -> "User":
        """Apply and persist a partial update to this user's fields.

        Only known attributes are updated; ``updated_at`` is refreshed
        automatically.
        """
        for key, value in fields.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.updated_at = datetime.now(timezone.utc)

        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].update_one(
                {"id": self.id}, {"$set": self.to_dict()}
            )
        else:
            _MEMORY_STORE[self.id] = self.to_dict()
        logger.info("Updated user %s", self.email)
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
