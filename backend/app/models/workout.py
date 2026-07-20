import logging
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Name of the MongoDB collection backing generated workout plans.
COLLECTION_NAME = "workout_plans"

# In-memory fallback store used when MongoDB is unreachable. Keyed by plan id.
_MEMORY_STORE: Dict[str, dict] = {}


class Exercise:
    """A single exercise within a day's workout.

    Provides :meth:`normalize` to coerce the loosely-typed exercise objects
    the LLM returns into a consistent shape.
    """

    def __init__(
        self,
        name: str,
        sets: int = 3,
        reps: str = "10",
        rest: str = "60s",
        difficulty: str = "medium",
        video_url: Optional[str] = None,
    ) -> None:
        """Initialise an exercise with sensible defaults for missing fields."""
        self.name = name
        self.sets = sets
        self.reps = reps
        self.rest = rest
        self.difficulty = difficulty
        self.video_url = video_url

    def to_dict(self) -> dict:
        """Serialise the exercise to a plain dict."""
        return {
            "name": self.name,
            "sets": self.sets,
            "reps": self.reps,
            "rest": self.rest,
            "difficulty": self.difficulty,
            "video_url": self.video_url,
        }

    @classmethod
    def normalize(cls, data: dict) -> dict:
        """Return a clean exercise dict from an arbitrary LLM exercise object.

        Tolerates alternative key names (``rest_time``/``rest_seconds``,
        ``difficulty_level``) and coerces values to the expected types.
        """
        name = str(data.get("name") or data.get("exercise") or "Exercise").strip()
        sets = data.get("sets", 3)
        try:
            sets = int(sets)
        except (TypeError, ValueError):
            sets = 3
        reps = str(data.get("reps", "10")).strip()
        rest = str(
            data.get("rest") or data.get("rest_time") or data.get("rest_seconds") or "60s"
        ).strip()
        difficulty = str(
            data.get("difficulty") or data.get("difficulty_level") or "medium"
        ).strip()
        video_url = data.get("video_url")
        return cls(name, sets, reps, rest, difficulty, video_url).to_dict()


class WorkoutPlan:
    """A weekly (Mon-Sun) workout plan for a user.

    Persists to MongoDB when available and falls back to an in-memory store
    otherwise, mirroring the other models.
    """

    def __init__(
        self,
        user_id: str,
        week: List[Dict[str, Any]],
        fitness_goal: Optional[str] = None,
        experience_level: Optional[str] = None,
        id: Optional[str] = None,
        log_date: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a plan, defaulting id/date/timestamp when omitted."""
        self.id: str = id or str(uuid4())
        self.user_id: str = user_id
        # Each entry: {"day": str, "workout_type": str, "exercises": [dict, ...]}.
        self.week: List[Dict[str, Any]] = week
        self.fitness_goal: Optional[str] = fitness_goal
        self.experience_level: Optional[str] = experience_level
        self.log_date: str = log_date or date.today().isoformat()
        self.created_at: datetime = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Serialise the plan to a plain dict for storage."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "week": self.week,
            "fitness_goal": self.fitness_goal,
            "experience_level": self.experience_level,
            "log_date": self.log_date,
            "created_at": self.created_at,
        }

    @classmethod
    def _from_dict(cls, data: dict) -> "WorkoutPlan":
        """Reconstruct a ``WorkoutPlan`` from a stored dict."""
        return cls(
            user_id=data["user_id"],
            week=data.get("week", []),
            fitness_goal=data.get("fitness_goal"),
            experience_level=data.get("experience_level"),
            id=data.get("id"),
            log_date=data.get("log_date"),
            created_at=data.get("created_at"),
        )

    async def save(self) -> "WorkoutPlan":
        """Persist this plan (append-only; newest is the active plan)."""
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].insert_one(self.to_dict())
        else:
            _MEMORY_STORE[self.id] = self.to_dict()
        logger.info("Saved workout plan for user %s", self.user_id)
        return self

    @classmethod
    async def get_latest_for_user(cls, user_id: str) -> Optional["WorkoutPlan"]:
        """Return the user's most recently generated plan, or ``None``."""
        db = get_database()
        if db is not None:
            data = await db[COLLECTION_NAME].find_one(
                {"user_id": user_id}, sort=[("created_at", -1)]
            )
            return cls._from_dict(data) if data else None
        plans = [d for d in _MEMORY_STORE.values() if d["user_id"] == user_id]
        if not plans:
            return None
        return cls._from_dict(max(plans, key=lambda d: d["created_at"]))


# Collection + in-memory fallback for completed-workout logs.
WORKOUT_LOG_COLLECTION = "workout_logs"
_WORKOUT_LOG_MEMORY: Dict[str, dict] = {}


class WorkoutLog:
    """A record of a completed workout session for a user."""

    def __init__(
        self,
        user_id: str,
        exercises: List[Dict[str, Any]],
        duration_minutes: int,
        intensity: str = "medium",
        xp_earned: int = 0,
        id: Optional[str] = None,
        log_date: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a workout log, defaulting id/date/timestamp when omitted."""
        self.id: str = id or str(uuid4())
        self.user_id: str = user_id
        self.exercises: List[Dict[str, Any]] = exercises
        self.duration_minutes: int = duration_minutes
        self.intensity: str = intensity
        self.xp_earned: int = xp_earned
        self.log_date: str = log_date or date.today().isoformat()
        self.created_at: datetime = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Serialise the workout log to a plain dict for storage."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "exercises": self.exercises,
            "duration_minutes": self.duration_minutes,
            "intensity": self.intensity,
            "xp_earned": self.xp_earned,
            "log_date": self.log_date,
            "created_at": self.created_at,
        }

    @classmethod
    def _from_dict(cls, data: dict) -> "WorkoutLog":
        """Reconstruct a ``WorkoutLog`` from a stored dict."""
        return cls(
            user_id=data["user_id"],
            exercises=data.get("exercises", []),
            duration_minutes=data.get("duration_minutes", 0),
            intensity=data.get("intensity", "medium"),
            xp_earned=data.get("xp_earned", 0),
            id=data.get("id"),
            log_date=data.get("log_date"),
            created_at=data.get("created_at"),
        )

    async def save(self) -> "WorkoutLog":
        """Persist this workout log (append-only)."""
        db = get_database()
        if db is not None:
            await db[WORKOUT_LOG_COLLECTION].insert_one(self.to_dict())
        else:
            _WORKOUT_LOG_MEMORY[self.id] = self.to_dict()
        logger.info("Saved workout log for user %s", self.user_id)
        return self

    @classmethod
    async def get_history(cls, user_id: str, days: int = 30) -> List["WorkoutLog"]:
        """Return the user's workout logs, newest first, capped at ``days``."""
        db = get_database()
        if db is not None:
            cursor = (
                db[WORKOUT_LOG_COLLECTION]
                .find({"user_id": user_id})
                .sort("created_at", -1)
                .limit(days)
            )
            return [cls._from_dict(d) async for d in cursor]
        logs = [d for d in _WORKOUT_LOG_MEMORY.values() if d["user_id"] == user_id]
        logs.sort(key=lambda d: d["created_at"], reverse=True)
        return [cls._from_dict(d) for d in logs[:days]]

    @classmethod
    async def get_workout_dates(cls, user_id: str) -> List[str]:
        """Return the distinct ISO dates on which the user logged a workout."""
        db = get_database()
        if db is not None:
            dates = await db[WORKOUT_LOG_COLLECTION].distinct(
                "log_date", {"user_id": user_id}
            )
            return list(dates)
        return list(
            {d["log_date"] for d in _WORKOUT_LOG_MEMORY.values() if d["user_id"] == user_id}
        )

    @classmethod
    async def count_for_user(cls, user_id: str) -> int:
        """Return the total number of workouts the user has logged."""
        db = get_database()
        if db is not None:
            return await db[WORKOUT_LOG_COLLECTION].count_documents({"user_id": user_id})
        return sum(1 for d in _WORKOUT_LOG_MEMORY.values() if d["user_id"] == user_id)
