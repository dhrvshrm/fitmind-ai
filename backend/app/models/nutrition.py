import logging
from datetime import date as date_cls
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Collections + in-memory fallbacks for meals and daily water intake.
MEAL_COLLECTION = "meals"
WATER_COLLECTION = "water_intake"
_MEAL_MEMORY: Dict[str, dict] = {}
_WATER_MEMORY: Dict[str, dict] = {}


class Meal:
    """A single logged meal with its macronutrient breakdown."""

    def __init__(
        self,
        user_id: str,
        name: str,
        calories: float,
        protein: float,
        carbs: float,
        fats: float,
        id: Optional[str] = None,
        log_date: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a meal, defaulting id/date/timestamp when omitted."""
        self.id: str = id or str(uuid4())
        self.user_id: str = user_id
        self.name: str = name
        self.calories: float = calories
        self.protein: float = protein
        self.carbs: float = carbs
        self.fats: float = fats
        self.log_date: str = log_date or date_cls.today().isoformat()
        self.created_at: datetime = created_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """Serialise the meal to a plain dict for storage."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "calories": self.calories,
            "protein": self.protein,
            "carbs": self.carbs,
            "fats": self.fats,
            "log_date": self.log_date,
            "created_at": self.created_at,
        }

    @classmethod
    def _from_dict(cls, data: dict) -> "Meal":
        """Reconstruct a ``Meal`` from a stored dict."""
        return cls(
            user_id=data["user_id"],
            name=data["name"],
            calories=data.get("calories", 0),
            protein=data.get("protein", 0),
            carbs=data.get("carbs", 0),
            fats=data.get("fats", 0),
            id=data.get("id"),
            log_date=data.get("log_date"),
            created_at=data.get("created_at"),
        )

    async def save(self) -> "Meal":
        """Persist this meal (append-only)."""
        db = get_database()
        if db is not None:
            await db[MEAL_COLLECTION].insert_one(self.to_dict())
        else:
            _MEAL_MEMORY[self.id] = self.to_dict()
        logger.info("Saved meal '%s' for user %s", self.name, self.user_id)
        return self

    @classmethod
    async def get_by_date(cls, user_id: str, log_date: str) -> List["Meal"]:
        """Return the user's meals for a specific ISO date (oldest first)."""
        db = get_database()
        if db is not None:
            cursor = db[MEAL_COLLECTION].find(
                {"user_id": user_id, "log_date": log_date}
            ).sort("created_at", 1)
            return [cls._from_dict(d) async for d in cursor]
        meals = [
            d
            for d in _MEAL_MEMORY.values()
            if d["user_id"] == user_id and d["log_date"] == log_date
        ]
        meals.sort(key=lambda d: d["created_at"])
        return [cls._from_dict(d) for d in meals]

    @classmethod
    async def get_dates(cls, user_id: str) -> List[str]:
        """Return the distinct ISO dates on which the user logged meals."""
        db = get_database()
        if db is not None:
            dates = await db[MEAL_COLLECTION].distinct("log_date", {"user_id": user_id})
            return list(dates)
        return list(
            {d["log_date"] for d in _MEAL_MEMORY.values() if d["user_id"] == user_id}
        )


async def add_water(user_id: str, amount_ml: int, log_date: Optional[str] = None) -> int:
    """Add water intake for a day and return the new daily total (ml)."""
    day = log_date or date_cls.today().isoformat()
    db = get_database()
    if db is not None:
        await db[WATER_COLLECTION].update_one(
            {"user_id": user_id, "log_date": day},
            {"$inc": {"total_ml": amount_ml}},
            upsert=True,
        )
        doc = await db[WATER_COLLECTION].find_one({"user_id": user_id, "log_date": day})
        return int(doc.get("total_ml", 0)) if doc else amount_ml
    key = f"{user_id}:{day}"
    entry = _WATER_MEMORY.setdefault(key, {"total_ml": 0})
    entry["total_ml"] += amount_ml
    return entry["total_ml"]


async def get_water(user_id: str, log_date: Optional[str] = None) -> int:
    """Return the user's total water intake (ml) for a day."""
    day = log_date or date_cls.today().isoformat()
    db = get_database()
    if db is not None:
        doc = await db[WATER_COLLECTION].find_one({"user_id": user_id, "log_date": day})
        return int(doc.get("total_ml", 0)) if doc else 0
    return _WATER_MEMORY.get(f"{user_id}:{day}", {}).get("total_ml", 0)
