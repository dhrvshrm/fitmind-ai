import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Daily step counts: one document per user per local date ("YYYY-MM-DD"),
# replaced when the user edits the day. Entered by hand for now; automatic
# sync (Health Connect through a native wrapper) is a later step.
STEPS_COLLECTION = "step_logs"
# Per-user activity settings: step target, work hours and break reminders.
SETTINGS_COLLECTION = "activity_settings"

# In-memory fallbacks, keyed "<user_id>:<date>" and "<user_id>" so the
# account deletion cascade can find them.
_STEPS_MEMORY: Dict[str, dict] = {}
_SETTINGS_MEMORY: Dict[str, dict] = {}


async def upsert_steps(user_id: str, local_date: str, steps: int, source: str = "manual") -> dict:
    """Set the step count for one day (creating or replacing it)."""
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "local_date": local_date,
        "steps": steps,
        "source": source,
        "updated_at": now,
    }
    db = get_database()
    if db is not None:
        await db[STEPS_COLLECTION].update_one(
            {"user_id": user_id, "local_date": local_date},
            {"$set": doc, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
    else:
        key = f"{user_id}:{local_date}"
        previous = _STEPS_MEMORY.get(key, {})
        _STEPS_MEMORY[key] = {"created_at": previous.get("created_at", now), **doc}
    return doc


async def delete_steps(user_id: str, local_date: str) -> bool:
    """Remove one day's entry. Returns False if there was none."""
    db = get_database()
    if db is not None:
        result = await db[STEPS_COLLECTION].delete_one({"user_id": user_id, "local_date": local_date})
        return result.deleted_count > 0
    return _STEPS_MEMORY.pop(f"{user_id}:{local_date}", None) is not None


async def list_steps(user_id: str, start_date: str, end_date: str) -> List[dict]:
    """Entries between two local dates (inclusive), oldest first."""
    db = get_database()
    if db is not None:
        cursor = db[STEPS_COLLECTION].find(
            {"user_id": user_id, "local_date": {"$gte": start_date, "$lte": end_date}},
            {"_id": 0},
        ).sort("local_date", 1)
        return await cursor.to_list(length=None)
    entries = [
        dict(v) for v in _STEPS_MEMORY.values()
        if v["user_id"] == user_id and start_date <= v["local_date"] <= end_date
    ]
    return sorted(entries, key=lambda e: e["local_date"])


async def get_settings(user_id: str) -> Optional[dict]:
    """The user's stored activity settings, or None if never saved."""
    db = get_database()
    if db is not None:
        return await db[SETTINGS_COLLECTION].find_one({"user_id": user_id}, {"_id": 0})
    stored = _SETTINGS_MEMORY.get(user_id)
    return dict(stored) if stored else None


async def save_settings(user_id: str, fields: dict) -> None:
    """Merge ``fields`` into the user's activity settings."""
    now = datetime.now(timezone.utc)
    db = get_database()
    if db is not None:
        await db[SETTINGS_COLLECTION].update_one(
            {"user_id": user_id},
            {"$set": {**fields, "user_id": user_id, "updated_at": now}},
            upsert=True,
        )
    else:
        stored = _SETTINGS_MEMORY.setdefault(user_id, {"user_id": user_id})
        stored.update({**fields, "updated_at": now})
