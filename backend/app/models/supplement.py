"""Supplements a user takes and their daily check-offs.

- ``user_supplements``: what they take (catalogue id or custom), dose, timing,
  optional reminder time and, for protein powders, macros per serving.
- ``supplement_logs``: one entry per supplement per local day it was taken,
  with the id of the meal created for protein powders (so unticking removes it).
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from app.health.store import Store

USER_SUPPLEMENTS = Store("user_supplements")
LOGS = Store("supplement_logs")
_SUPPLEMENT_MEMORY = USER_SUPPLEMENTS.memory
_LOG_MEMORY = LOGS.memory


async def create(user_id: str, fields: dict) -> dict:
    now = datetime.now(timezone.utc)
    doc = {
        **fields,
        "id": str(uuid4()),
        "user_id": user_id,
        "active": True,
        "created_at": now,
        "updated_at": now,
    }
    return await USER_SUPPLEMENTS.insert(doc)


async def get(user_id: str, supplement_id: str) -> Optional[dict]:
    return await USER_SUPPLEMENTS.find_one({"id": supplement_id, "user_id": user_id})


async def list_active(user_id: str) -> List[dict]:
    return await USER_SUPPLEMENTS.find({"user_id": user_id, "active": True}, sort=("created_at", 1))


async def update(user_id: str, supplement_id: str, fields: dict) -> bool:
    fields = {**fields, "updated_at": datetime.now(timezone.utc)}
    return await USER_SUPPLEMENTS.update({"id": supplement_id, "user_id": user_id}, fields)


async def delete(user_id: str, supplement_id: str) -> int:
    await LOGS.delete({"user_id": user_id, "user_supplement_id": supplement_id})
    return await USER_SUPPLEMENTS.delete({"id": supplement_id, "user_id": user_id})


async def get_log(user_id: str, supplement_id: str, local_date: str) -> Optional[dict]:
    return await LOGS.find_one(
        {"user_id": user_id, "user_supplement_id": supplement_id, "local_date": local_date}
    )


async def add_log(user_id: str, supplement_id: str, local_date: str, meal_id: Optional[str]) -> dict:
    doc = {
        "id": str(uuid4()),
        "user_id": user_id,
        "user_supplement_id": supplement_id,
        "local_date": local_date,
        "meal_id": meal_id,
        "taken_at": datetime.now(timezone.utc),
    }
    return await LOGS.insert(doc)


async def delete_log(user_id: str, log_id: str) -> int:
    return await LOGS.delete({"id": log_id, "user_id": user_id})


async def logs_for_dates(user_id: str, dates: List[str]) -> List[dict]:
    return await LOGS.find({"user_id": user_id, "local_date": {"$in": dates}})
