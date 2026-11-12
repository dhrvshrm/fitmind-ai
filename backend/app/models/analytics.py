"""Product analytics events (counts of what people do, never what they ate or weigh).

Each event is ``{user_id, event, properties, local_date, at}``. ``local_date``
is the user's own day when it happened, so "logged on day 1" means their day 1.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

COLLECTION_NAME = "analytics_events"
_MEMORY_STORE: Dict[str, dict] = {}


async def insert(user_id: str, event: str, properties: dict, local_date: str) -> dict:
    """Store one event and return it."""
    doc = {
        "id": str(uuid4()),
        "user_id": user_id,
        "event": event,
        "properties": properties,
        "local_date": local_date,
        "at": datetime.now(timezone.utc),
    }
    db = get_database()
    if db is not None:
        await db[COLLECTION_NAME].insert_one(dict(doc))
    else:
        _MEMORY_STORE[doc["id"]] = dict(doc)
    return doc


async def find(events: Optional[List[str]] = None, since: Optional[str] = None,
               user_id: Optional[str] = None) -> List[dict]:
    """Events, optionally filtered by name, earliest local date and user."""
    query: dict = {}
    if events:
        query["event"] = {"$in": list(events)}
    if since:
        query["local_date"] = {"$gte": since}
    if user_id:
        query["user_id"] = user_id
    db = get_database()
    if db is not None:
        return [d async for d in db[COLLECTION_NAME].find(query, {"_id": 0})]
    return [
        dict(d) for d in _MEMORY_STORE.values()
        if (not events or d["event"] in events)
        and (not since or d["local_date"] >= since)
        and (not user_id or d["user_id"] == user_id)
    ]
