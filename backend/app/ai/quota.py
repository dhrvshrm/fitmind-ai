"""Per-user daily limits on AI calls, to stay inside free-tier provider quotas."""
import logging
from typing import Dict

from pymongo import ReturnDocument

from app.config.database import get_database
from app.config.settings import get_settings
from app.utils.time import local_today_iso

logger = logging.getLogger(__name__)

COLLECTION_NAME = "ai_usage"
_MEMORY_STORE: Dict[str, int] = {}


class AIQuotaExceeded(Exception):
    """Raised when a user has used up their AI calls for the day."""


async def consume(user_id: str) -> int:
    """Count one AI call for the user today and return the day's total.

    Raises:
        AIQuotaExceeded: if this call would exceed ``AI_DAILY_QUOTA``.
    """
    limit = get_settings().AI_DAILY_QUOTA
    day = local_today_iso()
    db = get_database()
    if db is not None:
        doc = await db[COLLECTION_NAME].find_one_and_update(
            {"user_id": user_id, "local_date": day},
            {"$inc": {"count": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        used = int(doc["count"])
    else:
        key = f"{user_id}:{day}"
        _MEMORY_STORE[key] = _MEMORY_STORE.get(key, 0) + 1
        used = _MEMORY_STORE[key]

    if used > limit:
        logger.info("AI quota exceeded for user %s (%d/%d)", user_id, used, limit)
        raise AIQuotaExceeded(f"Daily AI limit of {limit} requests reached")
    return used


async def get_usage(user_id: str) -> int:
    """Return how many AI calls the user has made today."""
    day = local_today_iso()
    db = get_database()
    if db is not None:
        doc = await db[COLLECTION_NAME].find_one({"user_id": user_id, "local_date": day})
        return int(doc["count"]) if doc else 0
    return _MEMORY_STORE.get(f"{user_id}:{day}", 0)
