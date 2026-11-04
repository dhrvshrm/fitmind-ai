import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database
from app.utils.time import local_today_iso

logger = logging.getLogger(__name__)

# Collections + in-memory fallbacks for meals and daily water intake.
MEAL_COLLECTION = "meals"
WATER_COLLECTION = "water_intake"
_MEAL_MEMORY: Dict[str, dict] = {}
_WATER_MEMORY: Dict[str, dict] = {}


class Meal:
    """A logged meal: its foods (items), totals and where the numbers came from.

    ``source`` summarises the items: ``verified`` (all from a food dataset or
    the user's own foods), ``estimated`` (all AI estimates), ``mixed``, or
    ``manual`` (typed in by the user). ``edited`` marks totals the user
    changed after logging. Older meals without items are still valid.
    """

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
        fiber: float = 0,
        meal_type: Optional[str] = None,
        eaten_at: Optional[str] = None,
        items: Optional[List[dict]] = None,
        source: str = "manual",
        edited: bool = False,
        updated_at: Optional[datetime] = None,
    ) -> None:
        """Initialise a meal, defaulting id/date/timestamp when omitted."""
        self.id: str = id or str(uuid4())
        self.user_id: str = user_id
        self.name: str = name
        self.calories: float = calories
        self.protein: float = protein
        self.carbs: float = carbs
        self.fats: float = fats
        self.fiber: float = fiber
        self.meal_type: Optional[str] = meal_type
        # Local "HH:MM" the user ate at, when known.
        self.eaten_at: Optional[str] = eaten_at
        self.items: List[dict] = items or []
        self.source: str = source
        self.edited: bool = edited
        self.log_date: str = log_date or local_today_iso()
        self.created_at: datetime = created_at or datetime.now(timezone.utc)
        self.updated_at: Optional[datetime] = updated_at

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
            "fiber": self.fiber,
            "meal_type": self.meal_type,
            "eaten_at": self.eaten_at,
            "items": self.items,
            "source": self.source,
            "edited": self.edited,
            "log_date": self.log_date,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    def public_dict(self) -> dict:
        """The meal as returned by the API."""
        data = self.to_dict()
        data.pop("user_id")
        data["date"] = data.pop("log_date")
        return data

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
            fiber=data.get("fiber", 0),
            meal_type=data.get("meal_type"),
            eaten_at=data.get("eaten_at"),
            items=data.get("items"),
            source=data.get("source", "manual"),
            edited=data.get("edited", False),
            updated_at=data.get("updated_at"),
        )

    async def save(self) -> "Meal":
        """Persist this meal (insert)."""
        db = get_database()
        if db is not None:
            await db[MEAL_COLLECTION].insert_one(self.to_dict())
        else:
            _MEAL_MEMORY[self.id] = self.to_dict()
        logger.info("Saved meal '%s' for user %s", self.name, self.user_id)
        return self

    async def update(self, fields: Dict) -> "Meal":
        """Apply and persist changes to the given fields only."""
        for key, value in fields.items():
            setattr(self, key, value)
        self.updated_at = datetime.now(timezone.utc)
        changes = {**fields, "updated_at": self.updated_at}
        db = get_database()
        if db is not None:
            await db[MEAL_COLLECTION].update_one(
                {"id": self.id, "user_id": self.user_id}, {"$set": changes}
            )
        else:
            _MEAL_MEMORY[self.id] = self.to_dict()
        return self

    async def delete(self) -> None:
        """Remove this meal permanently."""
        db = get_database()
        if db is not None:
            await db[MEAL_COLLECTION].delete_one({"id": self.id, "user_id": self.user_id})
        else:
            _MEAL_MEMORY.pop(self.id, None)

    @classmethod
    async def get_for_user(cls, user_id: str, meal_id: str) -> Optional["Meal"]:
        """Return one of the user's meals by id (None if missing or not theirs)."""
        db = get_database()
        if db is not None:
            data = await db[MEAL_COLLECTION].find_one({"id": meal_id, "user_id": user_id})
        else:
            data = _MEAL_MEMORY.get(meal_id)
            if data and data["user_id"] != user_id:
                data = None
        return cls._from_dict(data) if data else None

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
    async def get_since(cls, user_id: str, since_date: str) -> List["Meal"]:
        """Return the user's meals on or after ``since_date``, newest first."""
        db = get_database()
        if db is not None:
            cursor = db[MEAL_COLLECTION].find(
                {"user_id": user_id, "log_date": {"$gte": since_date}}
            ).sort("created_at", -1)
            return [cls._from_dict(d) async for d in cursor]
        meals = [
            d for d in _MEAL_MEMORY.values()
            if d["user_id"] == user_id and d["log_date"] >= since_date
        ]
        meals.sort(key=lambda d: d["created_at"], reverse=True)
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
    day = log_date or local_today_iso()
    db = get_database()
    if db is not None:
        await db[WATER_COLLECTION].update_one(
            {"user_id": user_id, "log_date": day},
            {"$inc": {"total_ml": amount_ml}},
            upsert=True,
        )
        doc = await db[WATER_COLLECTION].find_one({"user_id": user_id, "log_date": day})
        total = int(doc.get("total_ml", 0)) if doc else amount_ml
        # Negative adjustments must never drive the daily total below zero.
        if total < 0:
            await db[WATER_COLLECTION].update_one(
                {"user_id": user_id, "log_date": day},
                {"$set": {"total_ml": 0}},
            )
            total = 0
        return total
    key = f"{user_id}:{day}"
    entry = _WATER_MEMORY.setdefault(key, {"total_ml": 0})
    entry["total_ml"] = max(0, entry["total_ml"] + amount_ml)
    return entry["total_ml"]


async def get_water(user_id: str, log_date: Optional[str] = None) -> int:
    """Return the user's total water intake (ml) for a day."""
    day = log_date or local_today_iso()
    db = get_database()
    if db is not None:
        doc = await db[WATER_COLLECTION].find_one({"user_id": user_id, "log_date": day})
        return int(doc.get("total_ml", 0)) if doc else 0
    return _WATER_MEMORY.get(f"{user_id}:{day}", {}).get("total_ml", 0)


async def count_days_hydration_goal_met(user_id: str, goal_ml: int) -> int:
    """Count the days on which the user's total water intake reached ``goal_ml``."""
    db = get_database()
    if db is not None:
        cursor = db[WATER_COLLECTION].find(
            {"user_id": user_id, "total_ml": {"$gte": goal_ml}}
        )
        return len([doc async for doc in cursor])
    return sum(
        1
        for key, entry in _WATER_MEMORY.items()
        if key.startswith(f"{user_id}:") and entry.get("total_ml", 0) >= goal_ml
    )
