"""Storage for progress features: body measurements, flexible days, target
decisions, weekly insights and progress photos.

Each collection falls back to an in-memory dict when MongoDB isn't connected,
like the other models. Everything is keyed by ``user_id`` and listed in the
account deletion cascade (``privacy_service``).
"""
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

MEASUREMENTS_COLLECTION = "body_measurements"
FLEX_COLLECTION = "flexible_days"
TARGET_HISTORY_COLLECTION = "target_history"
INSIGHTS_COLLECTION = "weekly_insights"
PHOTOS_COLLECTION = "progress_photos"

_MEASUREMENTS_MEMORY: Dict[str, dict] = {}
_FLEX_MEMORY: Dict[str, dict] = {}
_TARGET_HISTORY_MEMORY: Dict[str, dict] = {}
_INSIGHTS_MEMORY: Dict[str, dict] = {}
_PHOTOS_MEMORY: Dict[str, dict] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Body measurements (one entry per user per day)
# ---------------------------------------------------------------------------
async def save_measurement(user_id: str, log_date: str, waist_cm: Optional[float], hip_cm: Optional[float]) -> dict:
    """Record waist and/or hip for a day, keeping any value not given this time."""
    fields = {k: v for k, v in {"waist_cm": waist_cm, "hip_cm": hip_cm}.items() if v is not None}
    db = get_database()
    if db is not None:
        await db[MEASUREMENTS_COLLECTION].update_one(
            {"user_id": user_id, "log_date": log_date},
            {
                "$set": {**fields, "updated_at": _now()},
                "$setOnInsert": {"id": str(uuid4()), "user_id": user_id, "log_date": log_date, "created_at": _now()},
            },
            upsert=True,
        )
        return await db[MEASUREMENTS_COLLECTION].find_one({"user_id": user_id, "log_date": log_date}, {"_id": 0})
    key = f"{user_id}:{log_date}"
    doc = _MEASUREMENTS_MEMORY.get(key) or {
        "id": str(uuid4()), "user_id": user_id, "log_date": log_date, "created_at": _now(),
    }
    doc.update({**fields, "updated_at": _now()})
    _MEASUREMENTS_MEMORY[key] = doc
    return dict(doc)


async def list_measurements(user_id: str, since: str) -> List[dict]:
    """Measurements on or after ``since``, oldest first."""
    db = get_database()
    if db is not None:
        cursor = db[MEASUREMENTS_COLLECTION].find({"user_id": user_id, "log_date": {"$gte": since}}, {"_id": 0})
        docs = [d async for d in cursor]
    else:
        docs = [dict(d) for d in _MEASUREMENTS_MEMORY.values() if d["user_id"] == user_id and d["log_date"] >= since]
    return sorted(docs, key=lambda d: d["log_date"])


# ---------------------------------------------------------------------------
# Flexible days (one per user per date)
# ---------------------------------------------------------------------------
async def save_flex_day(
    user_id: str, day: str, reason: str, extra_kcal: int, marked_on: str, note: Optional[str]
) -> dict:
    """Mark ``day`` as flexible (replacing an earlier mark for the same day)."""
    doc = {
        "user_id": user_id, "date": day, "reason": reason, "extra_kcal": extra_kcal,
        "marked_on": marked_on, "note": note, "created_at": _now(),
    }
    db = get_database()
    if db is not None:
        await db[FLEX_COLLECTION].update_one({"user_id": user_id, "date": day}, {"$set": dict(doc)}, upsert=True)
    else:
        _FLEX_MEMORY[f"{user_id}:{day}"] = dict(doc)
    return doc


async def delete_flex_day(user_id: str, day: str) -> bool:
    db = get_database()
    if db is not None:
        result = await db[FLEX_COLLECTION].delete_one({"user_id": user_id, "date": day})
        return result.deleted_count > 0
    return _FLEX_MEMORY.pop(f"{user_id}:{day}", None) is not None


async def list_flex_days(user_id: str, start: str, end: str) -> List[dict]:
    """Flexible days dated within [start, end], oldest first."""
    db = get_database()
    if db is not None:
        cursor = db[FLEX_COLLECTION].find({"user_id": user_id, "date": {"$gte": start, "$lte": end}}, {"_id": 0})
        docs = [d async for d in cursor]
    else:
        docs = [dict(d) for d in _FLEX_MEMORY.values() if d["user_id"] == user_id and start <= d["date"] <= end]
    return sorted(docs, key=lambda d: d["date"])


# ---------------------------------------------------------------------------
# Target decisions (accepted or dismissed adaptive suggestions)
# ---------------------------------------------------------------------------
async def add_target_decision(user_id: str, entry: dict) -> dict:
    doc = {**entry, "id": str(uuid4()), "user_id": user_id, "at": _now()}
    db = get_database()
    if db is not None:
        await db[TARGET_HISTORY_COLLECTION].insert_one(dict(doc))
    else:
        _TARGET_HISTORY_MEMORY[doc["id"]] = dict(doc)
    return doc


async def latest_target_decision(user_id: str) -> Optional[dict]:
    db = get_database()
    if db is not None:
        return await db[TARGET_HISTORY_COLLECTION].find_one({"user_id": user_id}, {"_id": 0}, sort=[("at", -1)])
    docs = [d for d in _TARGET_HISTORY_MEMORY.values() if d["user_id"] == user_id]
    return dict(max(docs, key=lambda d: d["at"])) if docs else None


# ---------------------------------------------------------------------------
# Weekly insights (one per user per week)
# ---------------------------------------------------------------------------
async def get_insight(user_id: str, week_start: str) -> Optional[dict]:
    db = get_database()
    if db is not None:
        return await db[INSIGHTS_COLLECTION].find_one({"user_id": user_id, "week_start": week_start}, {"_id": 0})
    doc = _INSIGHTS_MEMORY.get(f"{user_id}:{week_start}")
    return dict(doc) if doc else None


async def save_insight(user_id: str, week_start: str, insight: dict) -> dict:
    doc = {**insight, "user_id": user_id, "week_start": week_start, "created_at": _now()}
    db = get_database()
    if db is not None:
        await db[INSIGHTS_COLLECTION].update_one(
            {"user_id": user_id, "week_start": week_start}, {"$set": dict(doc)}, upsert=True
        )
    else:
        _INSIGHTS_MEMORY[f"{user_id}:{week_start}"] = dict(doc)
    return doc


# ---------------------------------------------------------------------------
# Progress photos (metadata only; the image lives in private R2 storage)
# ---------------------------------------------------------------------------
async def add_photo(user_id: str, key: str, log_date: str, content_type: str, size: int) -> dict:
    doc = {
        "id": str(uuid4()), "user_id": user_id, "key": key, "log_date": log_date,
        "content_type": content_type, "size": size, "created_at": _now(),
    }
    db = get_database()
    if db is not None:
        await db[PHOTOS_COLLECTION].insert_one(dict(doc))
    else:
        _PHOTOS_MEMORY[doc["id"]] = dict(doc)
    return doc


async def list_photos(user_id: str) -> List[dict]:
    """The user's photos, newest date first."""
    db = get_database()
    if db is not None:
        docs = [d async for d in db[PHOTOS_COLLECTION].find({"user_id": user_id}, {"_id": 0})]
    else:
        docs = [dict(d) for d in _PHOTOS_MEMORY.values() if d["user_id"] == user_id]
    return sorted(docs, key=lambda d: (d["log_date"], d["created_at"]), reverse=True)


async def get_photo(user_id: str, photo_id: str) -> Optional[dict]:
    db = get_database()
    if db is not None:
        return await db[PHOTOS_COLLECTION].find_one({"id": photo_id, "user_id": user_id}, {"_id": 0})
    doc = _PHOTOS_MEMORY.get(photo_id)
    return dict(doc) if doc and doc["user_id"] == user_id else None


async def delete_photo(user_id: str, photo_id: str) -> bool:
    db = get_database()
    if db is not None:
        result = await db[PHOTOS_COLLECTION].delete_one({"id": photo_id, "user_id": user_id})
        return result.deleted_count > 0
    doc = _PHOTOS_MEMORY.get(photo_id)
    if doc and doc["user_id"] == user_id:
        del _PHOTOS_MEMORY[photo_id]
        return True
    return False
