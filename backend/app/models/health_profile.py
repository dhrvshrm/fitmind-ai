"""A user's health profile (conditions, medications), encrypted at rest.

One document per user. Everything personal lives in ``data``, which is
encrypted with app/health/crypto.py; only ids and timestamps stay readable.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from app.health import crypto
from app.health.store import Store

PROFILES = Store("health_profiles")
_MEMORY_STORE = PROFILES.memory


async def get(user_id: str) -> Optional[dict]:
    """The decrypted profile data, or None if the user hasn't filled it in."""
    doc = await PROFILES.find_one({"user_id": user_id})
    if doc is None:
        return None
    data = crypto.decrypt(doc.get("data")) or {}
    return {**data, "updated_at": doc.get("updated_at")}


async def get_raw(user_id: str) -> Optional[dict]:
    """The stored document as-is (used by tests to check encryption)."""
    return await PROFILES.find_one({"user_id": user_id})


async def save(user_id: str, data: dict) -> dict:
    """Replace the user's profile data (encrypted) and return the stored form."""
    now = datetime.now(timezone.utc)
    existing = await PROFILES.find_one({"user_id": user_id})
    fields = {"data": crypto.encrypt(data), "updated_at": now}
    if existing:
        await PROFILES.update({"id": existing["id"]}, fields)
    else:
        await PROFILES.insert({"id": str(uuid4()), "user_id": user_id, "created_at": now, **fields})
    return {**data, "updated_at": now}


async def delete(user_id: str) -> int:
    return await PROFILES.delete({"user_id": user_id})
