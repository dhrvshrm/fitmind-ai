"""Web Push storage: browser subscriptions, reminder settings and a send log.

- ``push_subscriptions``: one document per browser/device a user allowed
  notifications on (endpoint plus encryption keys from the browser).
- ``reminder_settings``: which reminders a user wants, one document per user.
- ``reminder_sends``: one document per reminder sent, keyed by user, reminder
  and the user's local date, so each reminder goes out at most once a day.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from pymongo.errors import DuplicateKeyError

from app.config.database import get_database

logger = logging.getLogger(__name__)

SUBSCRIPTIONS = "push_subscriptions"
SETTINGS = "reminder_settings"
SENDS = "reminder_sends"

_SUBSCRIPTION_MEMORY: Dict[str, dict] = {}
_SETTINGS_MEMORY: Dict[str, dict] = {}
_SEND_MEMORY: Dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------
async def save_subscription(user_id: str, endpoint: str, keys: Dict[str, str],
                            user_agent: Optional[str] = None) -> dict:
    """Add or refresh a browser subscription (an endpoint belongs to one user at a time)."""
    doc = {
        "user_id": user_id,
        "endpoint": endpoint,
        "keys": {"p256dh": keys.get("p256dh", ""), "auth": keys.get("auth", "")},
        "user_agent": (user_agent or "")[:200],
        "updated_at": datetime.now(timezone.utc),
    }
    db = get_database()
    if db is not None:
        await db[SUBSCRIPTIONS].update_one({"endpoint": endpoint}, {"$set": doc}, upsert=True)
    else:
        _SUBSCRIPTION_MEMORY[endpoint] = dict(doc)
    return doc


async def delete_subscription(endpoint: str, user_id: Optional[str] = None) -> int:
    """Remove a subscription (only the user's own when ``user_id`` is given)."""
    query = {"endpoint": endpoint, **({"user_id": user_id} if user_id else {})}
    db = get_database()
    if db is not None:
        return (await db[SUBSCRIPTIONS].delete_many(query)).deleted_count
    current = _SUBSCRIPTION_MEMORY.get(endpoint)
    if current and (not user_id or current["user_id"] == user_id):
        del _SUBSCRIPTION_MEMORY[endpoint]
        return 1
    return 0


async def subscriptions_for(user_id: str) -> List[dict]:
    db = get_database()
    if db is not None:
        return [d async for d in db[SUBSCRIPTIONS].find({"user_id": user_id}, {"_id": 0})]
    return [dict(d) for d in _SUBSCRIPTION_MEMORY.values() if d["user_id"] == user_id]


async def subscribed_user_ids() -> List[str]:
    """Everyone with at least one device that can receive pushes."""
    db = get_database()
    if db is not None:
        return list(await db[SUBSCRIPTIONS].distinct("user_id"))
    return sorted({d["user_id"] for d in _SUBSCRIPTION_MEMORY.values()})


# ---------------------------------------------------------------------------
# Reminder settings
# ---------------------------------------------------------------------------
async def get_settings(user_id: str) -> Optional[dict]:
    db = get_database()
    if db is not None:
        return await db[SETTINGS].find_one({"user_id": user_id}, {"_id": 0})
    found = _SETTINGS_MEMORY.get(user_id)
    return dict(found) if found else None


async def save_settings(user_id: str, values: dict) -> dict:
    doc = {**values, "user_id": user_id, "updated_at": datetime.now(timezone.utc)}
    db = get_database()
    if db is not None:
        await db[SETTINGS].update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    else:
        _SETTINGS_MEMORY[user_id] = dict(doc)
    return doc


# ---------------------------------------------------------------------------
# Send log (dedupe)
# ---------------------------------------------------------------------------
async def claim_send(user_id: str, key: str, local_date: str) -> bool:
    """Mark a reminder as sent for a day. True only for the first caller.

    Claimed before sending, so two runs at once (the scheduler and an external
    cron ping) can't both send the same reminder.
    """
    doc = {"user_id": user_id, "key": key, "local_date": local_date, "at": datetime.now(timezone.utc)}
    db = get_database()
    if db is not None:
        try:
            result = await db[SENDS].update_one(
                {"user_id": user_id, "key": key, "local_date": local_date},
                {"$setOnInsert": doc},
                upsert=True,
            )
        except DuplicateKeyError:
            return False
        return result.upserted_id is not None
    mem_key = f"{user_id}:{key}:{local_date}"
    if mem_key in _SEND_MEMORY:
        return False
    _SEND_MEMORY[mem_key] = doc
    return True


async def was_sent(user_id: str, key: str, local_date: str) -> bool:
    db = get_database()
    if db is not None:
        return await db[SENDS].find_one({"user_id": user_id, "key": key, "local_date": local_date}) is not None
    return f"{user_id}:{key}:{local_date}" in _SEND_MEMORY
