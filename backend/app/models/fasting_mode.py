import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Fasting and festival modes a user has switched on (Navratri, Ramadan...),
# each for dates they chose. One mode per date; the service checks overlaps.
COLLECTION_NAME = "fasting_modes"
_MEMORY_STORE: Dict[str, dict] = {}


async def list_for_user(user_id: str) -> List[dict]:
    """All of the user's modes, earliest start first."""
    db = get_database()
    if db is not None:
        cursor = db[COLLECTION_NAME].find({"user_id": user_id}, {"_id": 0}).sort("start_date", 1)
        return await cursor.to_list(length=200)
    modes = [dict(m) for m in _MEMORY_STORE.values() if m["user_id"] == user_id]
    return sorted(modes, key=lambda m: m["start_date"])


async def create(user_id: str, fields: dict) -> dict:
    doc = {
        **fields,
        "id": str(uuid4()),
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
    }
    db = get_database()
    if db is not None:
        await db[COLLECTION_NAME].insert_one(dict(doc))
    else:
        _MEMORY_STORE[doc["id"]] = dict(doc)
    return doc


async def delete(user_id: str, mode_id: str) -> bool:
    """Remove one of the user's modes; False if it doesn't exist."""
    db = get_database()
    if db is not None:
        result = await db[COLLECTION_NAME].delete_one({"id": mode_id, "user_id": user_id})
        return result.deleted_count > 0
    existing: Optional[dict] = _MEMORY_STORE.get(mode_id)
    if existing is None or existing["user_id"] != user_id:
        return False
    del _MEMORY_STORE[mode_id]
    return True
