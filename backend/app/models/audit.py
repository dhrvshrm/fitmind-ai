import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

# Collection + in-memory fallback for the change history of user data.
COLLECTION_NAME = "audit_logs"
_MEMORY_STORE: Dict[str, dict] = {}

# Who made a change. AI-made changes must always be distinguishable from the
# user's own edits (e.g. so AI never silently overwrites verified values).
ACTOR_USER = "user"
ACTOR_AI = "ai"
ACTOR_SYSTEM = "system"


async def record_change(
    user_id: str,
    entity: str,
    action: str,
    before: Optional[Dict[str, Any]] = None,
    after: Optional[Dict[str, Any]] = None,
    actor: str = ACTOR_USER,
    entity_id: Optional[str] = None,
) -> None:
    """Append one entry to the user's audit trail.

    Only the fields that actually changed are kept from ``before``/``after``.
    Auditing must never break the change it describes, so failures are
    logged and swallowed.
    """
    before = before or {}
    after = after or {}
    changed = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
    entry = {
        "id": str(uuid4()),
        "user_id": user_id,
        "entity": entity,
        "entity_id": entity_id,
        "action": action,
        "actor": actor,
        "changed_fields": changed,
        "before": {k: before.get(k) for k in changed},
        "after": {k: after.get(k) for k in changed},
        "at": datetime.now(timezone.utc),
    }
    try:
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].insert_one(entry)
        else:
            _MEMORY_STORE[entry["id"]] = entry
    except Exception as e:
        logger.warning("Could not record audit entry for user %s: %s", user_id, e)


async def get_history(user_id: str, entity: Optional[str] = None, limit: int = 50) -> List[dict]:
    """Return the user's audit entries, newest first, optionally for one entity."""
    query: Dict[str, Any] = {"user_id": user_id}
    if entity:
        query["entity"] = entity
    db = get_database()
    if db is not None:
        cursor = db[COLLECTION_NAME].find(query, {"_id": 0}).sort("at", -1).limit(limit)
        return [doc async for doc in cursor]
    entries = [
        e for e in _MEMORY_STORE.values()
        if e["user_id"] == user_id and (entity is None or e["entity"] == entity)
    ]
    entries.sort(key=lambda e: e["at"], reverse=True)
    return entries[:limit]
