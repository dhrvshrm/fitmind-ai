import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# A user's personal food library: meals saved for one-tap logging, and
# custom foods/recipes with their own nutrition (searched before the
# public datasets when estimating).
SAVED_MEAL_COLLECTION = "saved_meals"
USER_FOOD_COLLECTION = "user_foods"
_SAVED_MEAL_MEMORY: Dict[str, dict] = {}
_USER_FOOD_MEMORY: Dict[str, dict] = {}


class _UserOwned:
    """Shared persistence for small per-user documents keyed by ``id``."""

    collection: str
    memory: Dict[str, dict]

    @classmethod
    async def _insert(cls, doc: dict) -> None:
        db = get_database()
        if db is not None:
            await db[cls.collection].insert_one(dict(doc))
        else:
            cls.memory[doc["id"]] = dict(doc)

    @classmethod
    async def _find_one(cls, user_id: str, doc_id: str) -> Optional[dict]:
        db = get_database()
        if db is not None:
            return await db[cls.collection].find_one({"id": doc_id, "user_id": user_id}, {"_id": 0})
        doc = cls.memory.get(doc_id)
        return dict(doc) if doc and doc["user_id"] == user_id else None

    @classmethod
    async def _find_all(cls, user_id: str, sort_field: str) -> List[dict]:
        db = get_database()
        if db is not None:
            cursor = db[cls.collection].find({"user_id": user_id}, {"_id": 0}).sort(sort_field, -1)
            return [doc async for doc in cursor]
        docs = [dict(d) for d in cls.memory.values() if d["user_id"] == user_id]
        return sorted(docs, key=lambda d: d.get(sort_field) or d["created_at"], reverse=True)

    @classmethod
    async def _delete(cls, user_id: str, doc_id: str) -> bool:
        db = get_database()
        if db is not None:
            result = await db[cls.collection].delete_one({"id": doc_id, "user_id": user_id})
            return result.deleted_count > 0
        doc = cls.memory.get(doc_id)
        if doc and doc["user_id"] == user_id:
            del cls.memory[doc_id]
            return True
        return False

    @classmethod
    async def _set(cls, user_id: str, doc_id: str, fields: dict) -> None:
        db = get_database()
        if db is not None:
            await db[cls.collection].update_one({"id": doc_id, "user_id": user_id}, {"$set": fields})
        elif doc_id in cls.memory:
            cls.memory[doc_id].update(fields)


class SavedMeal(_UserOwned):
    """A named combination of foods the user eats often ("My usual breakfast")."""

    collection = SAVED_MEAL_COLLECTION
    memory = _SAVED_MEAL_MEMORY

    @classmethod
    async def create(cls, user_id: str, name: str, items: List[dict], totals: dict,
                     meal_type: Optional[str] = None) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": name,
            "items": items,
            "totals": totals,
            "meal_type": meal_type,
            "times_logged": 0,
            "created_at": now,
            "last_logged_at": None,
        }
        await cls._insert(doc)
        return doc

    @classmethod
    async def list(cls, user_id: str) -> List[dict]:
        return await cls._find_all(user_id, "last_logged_at")

    @classmethod
    async def get(cls, user_id: str, saved_id: str) -> Optional[dict]:
        return await cls._find_one(user_id, saved_id)

    @classmethod
    async def delete(cls, user_id: str, saved_id: str) -> bool:
        return await cls._delete(user_id, saved_id)

    @classmethod
    async def mark_logged(cls, user_id: str, saved: dict) -> None:
        await cls._set(user_id, saved["id"], {
            "times_logged": saved.get("times_logged", 0) + 1,
            "last_logged_at": datetime.now(timezone.utc),
        })


class UserFood(_UserOwned):
    """A food or recipe the user defined, with nutrition for one serving."""

    collection = USER_FOOD_COLLECTION
    memory = _USER_FOOD_MEMORY

    @classmethod
    async def create(cls, user_id: str, name: str, serving_unit: str, serving_grams: float,
                     per_serving: dict, aliases: Optional[List[str]] = None) -> dict:
        doc = {
            "id": f"user:{uuid4()}",
            "user_id": user_id,
            "name": name,
            "aliases": aliases or [],
            "serving_unit": serving_unit,
            "serving_grams": serving_grams,
            "per_serving": per_serving,
            "created_at": datetime.now(timezone.utc),
        }
        await cls._insert(doc)
        return doc

    @classmethod
    async def list(cls, user_id: str) -> List[dict]:
        return await cls._find_all(user_id, "created_at")

    @classmethod
    async def delete(cls, user_id: str, food_id: str) -> bool:
        return await cls._delete(user_id, food_id)
