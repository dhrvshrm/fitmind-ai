import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# A user's meal plans. Every change (new plan, new meal option, swapped food)
# is stored as a new version; only the latest one is ``active``, earlier ones
# are kept as ``archived`` history.
COLLECTION_NAME = "diet_plans"
_MEMORY_STORE: Dict[str, dict] = {}

STATUS_ACTIVE = "active"
STATUS_ARCHIVED = "archived"


async def get_active(user_id: str) -> Optional[dict]:
    """The user's current plan, or None if they don't have one."""
    db = get_database()
    if db is not None:
        return await db[COLLECTION_NAME].find_one(
            {"user_id": user_id, "status": STATUS_ACTIVE}, {"_id": 0}, sort=[("version", -1)]
        )
    plans = [p for p in _MEMORY_STORE.values() if p["user_id"] == user_id and p["status"] == STATUS_ACTIVE]
    return dict(max(plans, key=lambda p: p["version"])) if plans else None


async def save_version(user_id: str, fields: dict, change: str, previous: Optional[dict]) -> dict:
    """Store ``fields`` as the user's new active plan and archive ``previous``.

    ``change`` says what produced this version (``created``, ``meal_regenerated``,
    ``item_swapped``...). What has been logged from the plan carries over.
    """
    now = datetime.now(timezone.utc)
    doc = {
        **fields,
        "id": str(uuid4()),
        "user_id": user_id,
        "version": (previous["version"] + 1) if previous else 1,
        "status": STATUS_ACTIVE,
        "change": change,
        "logged": (previous or {}).get("logged", {}),
        "created_by": "ai" if change in ("created", "regenerated", "meal_regenerated") else "user",
        "created_at": now,
    }
    db = get_database()
    if db is not None:
        if previous:
            await db[COLLECTION_NAME].update_one(
                {"id": previous["id"], "user_id": user_id}, {"$set": {"status": STATUS_ARCHIVED}}
            )
        await db[COLLECTION_NAME].insert_one(dict(doc))
    else:
        if previous and previous["id"] in _MEMORY_STORE:
            _MEMORY_STORE[previous["id"]]["status"] = STATUS_ARCHIVED
        _MEMORY_STORE[doc["id"]] = dict(doc)
    return doc


async def set_logged(
    user_id: str, plan_id: str, logged: Dict[str, list], links: Optional[Dict[str, Dict[str, str]]] = None
) -> None:
    """Record which plan meals were logged on which days (doesn't create a version).

    ``links`` maps day -> plan meal id -> the meal log it created, so deleting
    that log from the food diary frees the plan slot again.
    """
    fields: Dict[str, Any] = {"logged": logged}
    if links is not None:
        fields["logged_links"] = links
    db = get_database()
    if db is not None:
        await db[COLLECTION_NAME].update_one({"id": plan_id, "user_id": user_id}, {"$set": fields})
    elif plan_id in _MEMORY_STORE:
        _MEMORY_STORE[plan_id].update(fields)
