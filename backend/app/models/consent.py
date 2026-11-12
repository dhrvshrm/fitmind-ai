"""Versioned consent records for health data.

A record says the user agreed to a ``scope`` (what may be stored) at a
``version`` of the consent text. Withdrawing sets ``revoked_at``; the record
itself stays as proof of what was agreed and when (it holds no health data)
until the account is deleted.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from app.health.store import Store

CONSENTS = Store("consents")
_MEMORY_STORE = CONSENTS.memory


async def active(user_id: str, scope: str) -> Optional[dict]:
    """The user's current (not withdrawn) consent for ``scope``, newest first."""
    records = await CONSENTS.find(
        {"user_id": user_id, "scope": scope, "revoked_at": None}, sort=("granted_at", -1), limit=1
    )
    return records[0] if records else None


async def grant(user_id: str, scope: str, version: int) -> dict:
    doc = {
        "id": str(uuid4()),
        "user_id": user_id,
        "scope": scope,
        "version": version,
        "granted_at": datetime.now(timezone.utc),
        "revoked_at": None,
    }
    return await CONSENTS.insert(doc)


async def revoke(user_id: str, scope: str) -> int:
    """Mark every active consent for ``scope`` as withdrawn. Returns how many."""
    count = 0
    now = datetime.now(timezone.utc)
    for record in await CONSENTS.find({"user_id": user_id, "scope": scope, "revoked_at": None}):
        await CONSENTS.update({"id": record["id"]}, {"revoked_at": now})
        count += 1
    return count


async def history(user_id: str) -> List[dict]:
    return await CONSENTS.find({"user_id": user_id}, sort=("granted_at", -1))
