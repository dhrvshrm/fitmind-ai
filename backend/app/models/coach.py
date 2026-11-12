"""Coach chat storage: conversations, messages and proposed actions.

Three collections, all owned by one user:

- ``coach_conversations``: one per chat thread; the newest is the active one.
- ``coach_messages``: user and assistant turns, oldest first within a thread.
- ``coach_proposals``: actions the coach proposed (log a meal, swap a plan
  meal...). They hold the backend-computed payload that runs on confirm, and a
  status that only moves forward (pending -> executing -> done/failed, or
  pending -> cancelled).

Falls back to in-memory stores when no database is configured (local only).
"""
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from app.config.database import get_database

logger = logging.getLogger(__name__)

CONVERSATIONS = "coach_conversations"
MESSAGES = "coach_messages"
PROPOSALS = "coach_proposals"

_CONVERSATION_MEMORY: Dict[str, dict] = {}
_MESSAGE_MEMORY: Dict[str, dict] = {}
_PROPOSAL_MEMORY: Dict[str, dict] = {}

STATUS_PENDING = "pending"
STATUS_EXECUTING = "executing"
STATUS_DONE = "done"
STATUS_FAILED = "failed"
STATUS_CANCELLED = "cancelled"
STATUS_EXPIRED = "expired"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _strip(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    return {k: v for k, v in doc.items() if k != "_id"}


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------
async def get_active_conversation(user_id: str) -> Optional[dict]:
    """The user's newest conversation, or None."""
    db = get_database()
    if db is not None:
        return await db[CONVERSATIONS].find_one(
            {"user_id": user_id}, {"_id": 0}, sort=[("created_at", -1)]
        )
    mine = [c for c in _CONVERSATION_MEMORY.values() if c["user_id"] == user_id]
    return dict(max(mine, key=lambda c: c["created_at"])) if mine else None


async def create_conversation(user_id: str) -> dict:
    """Start a new conversation, which becomes the active one."""
    now = _now()
    doc = {"id": str(uuid4()), "user_id": user_id, "created_at": now, "updated_at": now}
    db = get_database()
    if db is not None:
        await db[CONVERSATIONS].insert_one(dict(doc))
    else:
        _CONVERSATION_MEMORY[doc["id"]] = dict(doc)
    return doc


async def list_conversation_ids(user_id: str) -> List[str]:
    """All of the user's conversation ids, newest first."""
    db = get_database()
    if db is not None:
        cursor = db[CONVERSATIONS].find({"user_id": user_id}, {"_id": 0, "id": 1}).sort("created_at", -1)
        return [d["id"] async for d in cursor]
    mine = sorted(
        (c for c in _CONVERSATION_MEMORY.values() if c["user_id"] == user_id),
        key=lambda c: c["created_at"],
        reverse=True,
    )
    return [c["id"] for c in mine]


async def delete_conversations(user_id: str, conversation_ids: List[str]) -> None:
    """Delete conversations with their messages and proposals."""
    if not conversation_ids:
        return
    db = get_database()
    if db is not None:
        query = {"user_id": user_id, "conversation_id": {"$in": conversation_ids}}
        await db[MESSAGES].delete_many(query)
        await db[PROPOSALS].delete_many(query)
        await db[CONVERSATIONS].delete_many({"user_id": user_id, "id": {"$in": conversation_ids}})
        return
    ids = set(conversation_ids)
    for store in (_MESSAGE_MEMORY, _PROPOSAL_MEMORY):
        for key in [k for k, v in store.items() if v["user_id"] == user_id and v["conversation_id"] in ids]:
            del store[key]
    for key in [k for k, v in _CONVERSATION_MEMORY.items() if v["user_id"] == user_id and k in ids]:
        del _CONVERSATION_MEMORY[key]


async def delete_all(user_id: str) -> None:
    """Remove every conversation, message and proposal of the user."""
    await delete_conversations(user_id, await list_conversation_ids(user_id))


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------
async def add_message(
    user_id: str,
    conversation_id: str,
    role: str,
    content: str,
    proposal_ids: Optional[List[str]] = None,
    kind: str = "text",
) -> dict:
    """Append a message to a conversation and return it."""
    now = _now()
    doc = {
        "id": str(uuid4()),
        "user_id": user_id,
        "conversation_id": conversation_id,
        "role": role,
        "kind": kind,
        "content": content,
        "proposal_ids": list(proposal_ids or []),
        "created_at": now,
    }
    db = get_database()
    if db is not None:
        await db[MESSAGES].insert_one(dict(doc))
        await db[CONVERSATIONS].update_one(
            {"id": conversation_id, "user_id": user_id}, {"$set": {"updated_at": now}}
        )
    else:
        _MESSAGE_MEMORY[doc["id"]] = dict(doc)
        if conversation_id in _CONVERSATION_MEMORY:
            _CONVERSATION_MEMORY[conversation_id]["updated_at"] = now
    return doc


async def get_messages(user_id: str, conversation_id: str, limit: int) -> List[dict]:
    """The last ``limit`` messages of a conversation, oldest first."""
    db = get_database()
    if db is not None:
        cursor = (
            db[MESSAGES]
            .find({"user_id": user_id, "conversation_id": conversation_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )
        docs = [d async for d in cursor]
        return list(reversed(docs))
    docs = sorted(
        (m for m in _MESSAGE_MEMORY.values()
         if m["user_id"] == user_id and m["conversation_id"] == conversation_id),
        key=lambda m: m["created_at"],
    )
    return [dict(d) for d in docs[-limit:]]


async def trim_messages(user_id: str, keep: int) -> int:
    """Delete the user's oldest messages beyond ``keep``. Returns how many went."""
    db = get_database()
    if db is not None:
        total = await db[MESSAGES].count_documents({"user_id": user_id})
        if total <= keep:
            return 0
        cursor = (
            db[MESSAGES]
            .find({"user_id": user_id}, {"_id": 0, "id": 1})
            .sort("created_at", 1)
            .limit(total - keep)
        )
        ids = [d["id"] async for d in cursor]
        await db[MESSAGES].delete_many({"user_id": user_id, "id": {"$in": ids}})
        await db[PROPOSALS].delete_many({"user_id": user_id, "message_id": {"$in": ids}})
        return len(ids)
    mine = sorted(
        (m for m in _MESSAGE_MEMORY.values() if m["user_id"] == user_id),
        key=lambda m: m["created_at"],
    )
    extra = mine[: max(0, len(mine) - keep)]
    ids = {m["id"] for m in extra}
    for key in ids:
        del _MESSAGE_MEMORY[key]
    for key in [k for k, v in _PROPOSAL_MEMORY.items() if v.get("message_id") in ids]:
        del _PROPOSAL_MEMORY[key]
    return len(ids)


# ---------------------------------------------------------------------------
# Proposals
# ---------------------------------------------------------------------------
async def save_proposal(doc: dict) -> dict:
    """Store a new pending proposal (``doc`` carries id, user and conversation)."""
    doc = {**doc, "status": STATUS_PENDING, "created_at": _now(), "result": None}
    db = get_database()
    if db is not None:
        await db[PROPOSALS].insert_one(dict(doc))
    else:
        _PROPOSAL_MEMORY[doc["id"]] = dict(doc)
    return doc


async def attach_message(user_id: str, proposal_ids: List[str], message_id: str) -> None:
    """Link proposals to the assistant message that shows them."""
    if not proposal_ids:
        return
    db = get_database()
    if db is not None:
        await db[PROPOSALS].update_many(
            {"user_id": user_id, "id": {"$in": proposal_ids}}, {"$set": {"message_id": message_id}}
        )
        return
    for pid in proposal_ids:
        if pid in _PROPOSAL_MEMORY and _PROPOSAL_MEMORY[pid]["user_id"] == user_id:
            _PROPOSAL_MEMORY[pid]["message_id"] = message_id


async def get_proposal(user_id: str, proposal_id: str) -> Optional[dict]:
    db = get_database()
    if db is not None:
        return await db[PROPOSALS].find_one({"id": proposal_id, "user_id": user_id}, {"_id": 0})
    doc = _PROPOSAL_MEMORY.get(proposal_id)
    return dict(doc) if doc and doc["user_id"] == user_id else None


async def get_proposals(user_id: str, proposal_ids: List[str]) -> List[dict]:
    if not proposal_ids:
        return []
    db = get_database()
    if db is not None:
        cursor = db[PROPOSALS].find({"user_id": user_id, "id": {"$in": proposal_ids}}, {"_id": 0})
        found = {d["id"]: d async for d in cursor}
    else:
        found = {
            pid: dict(_PROPOSAL_MEMORY[pid]) for pid in proposal_ids
            if pid in _PROPOSAL_MEMORY and _PROPOSAL_MEMORY[pid]["user_id"] == user_id
        }
    return [found[pid] for pid in proposal_ids if pid in found]


async def transition(
    user_id: str, proposal_id: str, from_status: str, to_status: str, result: Optional[dict] = None
) -> Optional[dict]:
    """Atomically move a proposal from one status to another.

    Returns the updated proposal, or None when it wasn't in ``from_status``
    (so a double tap can never run an action twice).
    """
    changes = {"status": to_status, "updated_at": _now()}
    if result is not None:
        changes["result"] = result
    db = get_database()
    if db is not None:
        from pymongo import ReturnDocument

        return _strip(await db[PROPOSALS].find_one_and_update(
            {"id": proposal_id, "user_id": user_id, "status": from_status},
            {"$set": changes},
            return_document=ReturnDocument.AFTER,
        ))
    doc = _PROPOSAL_MEMORY.get(proposal_id)
    if doc is None or doc["user_id"] != user_id or doc["status"] != from_status:
        return None
    doc.update(changes)
    return dict(doc)
