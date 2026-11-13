"""Logged sets per exercise, and the user's training state (easy week, level prompts).

One document per user, exercise and local date. Logging the same exercise
again that day replaces the earlier entry, so a corrected log doesn't count twice.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional

from app.config.database import get_database

logger = logging.getLogger(__name__)

COLLECTION_NAME = "exercise_logs"
STATE_COLLECTION = "training_state"
_MEMORY_STORE: Dict[str, dict] = {}
_STATE_MEMORY: Dict[str, dict] = {}


def _key(user_id: str, exercise_id: str, day: str) -> str:
    return f"{user_id}:{exercise_id}:{day}"


async def save_session(user_id: str, exercise_id: str, name: str, pattern: Optional[str],
                       day: str, sets: List[dict], felt: Optional[str]) -> dict:
    doc = {
        "user_id": user_id,
        "exercise_id": exercise_id,
        "name": name,
        "pattern": pattern,
        "date": day,
        "sets": sets,
        "felt": felt,
        "updated_at": datetime.now(timezone.utc),
    }
    db = get_database()
    if db is not None:
        await db[COLLECTION_NAME].update_one(
            {"user_id": user_id, "exercise_id": exercise_id, "date": day}, {"$set": doc}, upsert=True
        )
    else:
        _MEMORY_STORE[_key(user_id, exercise_id, day)] = doc
    return doc


async def history(user_id: str, exercise_id: str, limit: int = 20, before: Optional[str] = None) -> List[dict]:
    """This exercise's sessions, newest first (optionally only those before a date)."""
    query: dict = {"user_id": user_id, "exercise_id": exercise_id}
    if before:
        query["date"] = {"$lt": before}
    db = get_database()
    if db is not None:
        cursor = db[COLLECTION_NAME].find(query, {"_id": 0}).sort("date", -1).limit(limit)
        return [d async for d in cursor]
    docs = [d for d in _MEMORY_STORE.values()
            if d["user_id"] == user_id and d["exercise_id"] == exercise_id and (not before or d["date"] < before)]
    return sorted(docs, key=lambda d: d["date"], reverse=True)[:limit]


async def histories(user_id: str, exercise_ids: Iterable[str], per_exercise: int = 6,
                    before: Optional[str] = None) -> Dict[str, List[dict]]:
    """Recent sessions for several exercises at once, newest first."""
    result: Dict[str, List[dict]] = {}
    for exercise_id in dict.fromkeys(exercise_ids):
        result[exercise_id] = await history(user_id, exercise_id, per_exercise, before)
    return result


async def since(user_id: str, start: str) -> List[dict]:
    """Every logged exercise session from ``start`` (ISO date), oldest first."""
    db = get_database()
    if db is not None:
        cursor = db[COLLECTION_NAME].find({"user_id": user_id, "date": {"$gte": start}}, {"_id": 0}).sort("date", 1)
        return [d async for d in cursor]
    docs = [d for d in _MEMORY_STORE.values() if d["user_id"] == user_id and d["date"] >= start]
    return sorted(docs, key=lambda d: d["date"])


async def get_state(user_id: str) -> dict:
    db = get_database()
    if db is not None:
        return await db[STATE_COLLECTION].find_one({"user_id": user_id}, {"_id": 0}) or {}
    return dict(_STATE_MEMORY.get(user_id, {}))


async def update_state(user_id: str, fields: dict) -> dict:
    db = get_database()
    if db is not None:
        await db[STATE_COLLECTION].update_one({"user_id": user_id}, {"$set": {**fields, "user_id": user_id}}, upsert=True)
        return await get_state(user_id)
    state = _STATE_MEMORY.setdefault(user_id, {"user_id": user_id})
    state.update(fields)
    return dict(state)
