"""Friend challenges: a short goal two friends take on together.

``creator_id`` invites ``opponent_id``. Once accepted the challenge runs from
``start_date`` to ``end_date`` (local dates, inclusive). ``rewarded`` lists
participants who already got the completion XP, so it's paid at most once.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

COLLECTION_NAME = "friend_challenges"
_MEMORY_STORE: Dict[str, dict] = {}

STATUS_PENDING = "pending"
STATUS_ACTIVE = "active"
STATUS_DECLINED = "declined"
STATUS_CANCELLED = "cancelled"
OPEN_STATUSES = (STATUS_PENDING, STATUS_ACTIVE)


async def create(creator_id: str, opponent_id: str, kind: str, created_on: str) -> dict:
    """Store a new pending challenge invite."""
    doc = {
        "id": str(uuid4()),
        "kind": kind,
        "creator_id": creator_id,
        "opponent_id": opponent_id,
        "status": STATUS_PENDING,
        "created_on": created_on,
        "start_date": None,
        "end_date": None,
        "rewarded": [],
        "created_at": datetime.now(timezone.utc),
    }
    db = get_database()
    if db is not None:
        await db[COLLECTION_NAME].insert_one(dict(doc))
    else:
        _MEMORY_STORE[doc["id"]] = dict(doc)
    return doc


async def get(challenge_id: str) -> Optional[dict]:
    db = get_database()
    if db is not None:
        return await db[COLLECTION_NAME].find_one({"id": challenge_id}, {"_id": 0})
    doc = _MEMORY_STORE.get(challenge_id)
    return dict(doc) if doc else None


async def list_for(user_id: str) -> List[dict]:
    """Every challenge the user is part of, newest first."""
    db = get_database()
    if db is not None:
        query = {"$or": [{"creator_id": user_id}, {"opponent_id": user_id}]}
        docs = [d async for d in db[COLLECTION_NAME].find(query, {"_id": 0})]
    else:
        docs = [dict(d) for d in _MEMORY_STORE.values() if user_id in (d["creator_id"], d["opponent_id"])]
    return sorted(docs, key=lambda d: d["created_at"], reverse=True)


async def update(challenge_id: str, fields: dict) -> None:
    db = get_database()
    if db is not None:
        await db[COLLECTION_NAME].update_one({"id": challenge_id}, {"$set": fields})
    elif challenge_id in _MEMORY_STORE:
        _MEMORY_STORE[challenge_id].update(fields)


async def claim_reward(challenge_id: str, user_id: str) -> bool:
    """Mark ``user_id`` as rewarded; False if they already were (atomic in Mongo)."""
    db = get_database()
    if db is not None:
        result = await db[COLLECTION_NAME].update_one(
            {"id": challenge_id, "rewarded": {"$ne": user_id}}, {"$addToSet": {"rewarded": user_id}}
        )
        return result.modified_count > 0
    doc = _MEMORY_STORE.get(challenge_id)
    if doc is None or user_id in doc["rewarded"]:
        return False
    doc["rewarded"].append(user_id)
    return True
