"""Small key-value cache for AI results that are safe to reuse.

Used for deterministic, non-personal lookups (e.g. parsing "2 aloo paratha"
into structured food items), so repeated requests don't spend free-tier
quota. Never cache responses that contain a user's personal data.
"""
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from app.config.database import get_database

logger = logging.getLogger(__name__)

COLLECTION_NAME = "ai_cache"
DEFAULT_TTL = timedelta(days=30)
_MEMORY_STORE: Dict[str, Tuple[datetime, Any]] = {}


def make_key(namespace: str, *parts: str) -> str:
    """Build a stable cache key from a namespace and normalised input parts."""
    normalised = "\x1f".join(" ".join(p.lower().split()) for p in parts)
    return f"{namespace}:{hashlib.sha256(normalised.encode('utf-8')).hexdigest()}"


async def get(key: str) -> Optional[Any]:
    """Return the cached value for ``key``, or ``None`` if missing or expired."""
    now = datetime.now(timezone.utc)
    db = get_database()
    if db is not None:
        doc = await db[COLLECTION_NAME].find_one({"key": key})
        if not doc:
            return None
        expires_at = doc["expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return doc["value"] if expires_at > now else None
    entry = _MEMORY_STORE.get(key)
    if entry is None or entry[0] <= now:
        return None
    return entry[1]


async def put(key: str, value: Any, ttl: timedelta = DEFAULT_TTL) -> None:
    """Store ``value`` under ``key`` for ``ttl``. Failures are logged, not raised."""
    expires_at = datetime.now(timezone.utc) + ttl
    try:
        db = get_database()
        if db is not None:
            await db[COLLECTION_NAME].update_one(
                {"key": key},
                {"$set": {"key": key, "value": value, "expires_at": expires_at}},
                upsert=True,
            )
        else:
            _MEMORY_STORE[key] = (expires_at, value)
    except Exception as e:
        logger.warning("Could not write AI cache entry %s: %s", key, e)
