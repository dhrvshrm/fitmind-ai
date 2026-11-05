import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pymongo import ReturnDocument

from app.config.database import get_database
from app.nutrition.targets import LEGACY_GOALS
from app.utils.time import DEFAULT_TIMEZONE

logger = logging.getLogger(__name__)

# Name of the MongoDB collection backing users.
COLLECTION_NAME = "users"

# Default per-type notification opt-ins (all on). Keys match the toggleable
# notification types surfaced in the settings UI.
DEFAULT_NOTIFICATION_PREFERENCES = {
    "follow": True,
    "friend_request": True,
    "nudge": True,
    "weekly_report": True,
    "badge_earned": True,
    "streak_warning": True,
}

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
    "injuries",
    "activity_level",
    "timezone",
    "bmi",
    "tdee",
    "onboarding_completed",
)

# Onboarding v2 answers and computed targets. All optional: a missing value
# means "not answered yet", never "no". Sub-documents (food_preferences,
# food_access, lifestyle) are validated by the request schemas.
PERSONALISATION_FIELDS = (
    "goal_pace",
    "target_weight_kg",
    "body_fat_percent",
    "reproductive_status",
    "workout_days_per_week",
    "workout_time",
    "food_preferences",
    "food_access",
    "lifestyle",
    "targets",
    "targets_updated_at",
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
        injuries: Optional[List[str]] = None,
        activity_level: Optional[str] = None,
        timezone_name: Optional[str] = None,
        bmi: Optional[float] = None,
        tdee: Optional[int] = None,
        onboarding_completed: bool = False,
        badges: Optional[List[str]] = None,
        current_streak: int = 0,
        longest_streak: int = 0,
        notification_preferences: Optional[Dict[str, bool]] = None,
        personalisation: Optional[Dict[str, Any]] = None,
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
        self.injuries: List[str] = injuries or []
        self.activity_level: Optional[str] = activity_level
        # IANA timezone used to decide the user's "today" (e.g. Asia/Kolkata).
        self.timezone: str = timezone_name or DEFAULT_TIMEZONE
        self.bmi: Optional[float] = bmi
        self.tdee: Optional[int] = tdee
        self.onboarding_completed: bool = onboarding_completed
        self.badges: List[str] = badges or []
        self.current_streak: int = current_streak
        self.longest_streak: int = longest_streak
        for field in PERSONALISATION_FIELDS:
            setattr(self, field, (personalisation or {}).get(field))
        self.notification_preferences: Dict[str, bool] = {
            **DEFAULT_NOTIFICATION_PREFERENCES,
            **(notification_preferences or {}),
        }

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
            "injuries": self.injuries,
            "activity_level": self.activity_level,
            "timezone": self.timezone,
            "bmi": self.bmi,
            "tdee": self.tdee,
            "onboarding_completed": self.onboarding_completed,
            "badges": self.badges,
            "current_streak": self.current_streak,
            "longest_streak": self.longest_streak,
            "notification_preferences": self.notification_preferences,
            **{field: getattr(self, field) for field in PERSONALISATION_FIELDS},
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
            # Goal ids from before onboarding v2 are mapped to the current ones.
            fitness_goal=LEGACY_GOALS.get(data.get("fitness_goal"), data.get("fitness_goal")),
            experience_level=data.get("experience_level"),
            available_equipment=data.get("available_equipment"),
            injuries=data.get("injuries"),
            activity_level=data.get("activity_level"),
            timezone_name=data.get("timezone"),
            bmi=data.get("bmi"),
            tdee=data.get("tdee"),
            onboarding_completed=data.get("onboarding_completed", False),
            badges=data.get("badges"),
            current_streak=data.get("current_streak", 0),
            longest_streak=data.get("longest_streak", 0),
            notification_preferences=data.get("notification_preferences"),
            personalisation={field: data.get(field) for field in PERSONALISATION_FIELDS},
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

        Only known attributes are updated, and only those fields are written,
        so concurrent updates to other fields (XP, badges, streaks) are not
        overwritten with stale values. ``updated_at`` is refreshed
        automatically. Use :meth:`increment_xp` / :meth:`add_badges` for
        counters and sets that several requests may change at once.
        """
        changes = {k: v for k, v in fields.items() if hasattr(self, k) and k != "id"}
        for key, value in changes.items():
            setattr(self, key, value)
        self.updated_at = datetime.now(timezone.utc)
        changes["updated_at"] = self.updated_at

        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].update_one({"id": self.id}, {"$set": changes})
        else:
            stored = _MEMORY_STORE.setdefault(self.id, self.to_dict())
            stored.update(changes)
        logger.info("Updated user %s fields %s", self.id, sorted(changes))
        return self

    @classmethod
    async def increment_xp(cls, user_id: str, amount: int) -> Optional[int]:
        """Atomically add ``amount`` XP and return the new total (None if no user)."""
        db = get_database()
        if db is not None:
            doc = await db[COLLECTION_NAME].find_one_and_update(
                {"id": user_id},
                {"$inc": {"xp": amount}},
                return_document=ReturnDocument.AFTER,
            )
            return int(doc["xp"]) if doc else None
        stored = _MEMORY_STORE.get(user_id)
        if stored is None:
            return None
        stored["xp"] = stored.get("xp", 0) + amount
        return stored["xp"]

    @classmethod
    async def add_badges(cls, user_id: str, badge_ids: List[str]) -> None:
        """Atomically add badges to a user's set (duplicates are ignored)."""
        if not badge_ids:
            return
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].update_one(
                {"id": user_id}, {"$addToSet": {"badges": {"$each": badge_ids}}}
            )
            return
        stored = _MEMORY_STORE.get(user_id)
        if stored is not None:
            stored["badges"] = list(dict.fromkeys(stored.get("badges", []) + badge_ids))

    @classmethod
    async def get_by_email(cls, email: str) -> Optional["User"]:
        """Return the user with the given email, or ``None`` if not found.

        Emails are stored lowercased; the exact spelling is also tried so
        accounts created before normalisation can still sign in.
        """
        candidates = list(dict.fromkeys([email.strip().lower(), email]))
        db = get_database()
        if db is not None:
            data = await db[COLLECTION_NAME].find_one({"email": {"$in": candidates}})
            return cls._from_dict(data) if data else None
        for data in _MEMORY_STORE.values():
            if data["email"] in candidates:
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

    @classmethod
    async def get_all(cls) -> List["User"]:
        """Return all users (used by background jobs that scan every user)."""
        db = get_database()
        if db is not None:
            return [cls._from_dict(d) async for d in db[COLLECTION_NAME].find({})]
        return [cls._from_dict(d) for d in _MEMORY_STORE.values()]

    @classmethod
    async def get_by_username(cls, username: str) -> Optional["User"]:
        """Return the user with the given username, or ``None`` if not found."""
        db = get_database()
        if db is not None:
            data = await db[COLLECTION_NAME].find_one({"username": username})
            return cls._from_dict(data) if data else None
        for data in _MEMORY_STORE.values():
            if data.get("username") == username:
                return cls._from_dict(data)
        return None

    @classmethod
    async def delete(cls, user_id: str) -> None:
        """Permanently remove a user by id."""
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].delete_one({"id": user_id})
        else:
            _MEMORY_STORE.pop(user_id, None)
