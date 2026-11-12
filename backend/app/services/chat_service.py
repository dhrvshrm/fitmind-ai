"""The coach: persisted conversations, tool use, and propose-then-confirm actions.

Flow for one user message:

1. The message is stored, and the model gets the context blocks, the recent
   conversation and the tool list, and answers with JSON: a reply and any tool
   calls (structured output through ``generate_json``; the free providers'
   tool-calling APIs differ, and this keeps one validated path for both).
2. Read tools run at once and their results go back to the model (up to
   ``MAX_ROUNDS`` rounds). Invalid or missing arguments go back as errors, so
   the model can ask the user instead of guessing.
3. Action tools never run here. Their ``prepare`` step computes, in backend
   code, what would change and stores a pending proposal. The UI shows it as a
   confirm card; :func:`confirm_action` runs it from the stored payload and the
   user is told the backend's result, not the model's.

When the model is unavailable the coach falls back to a plain streamed answer
(the previous behaviour), and failing that, an honest message.
"""
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple
from uuid import uuid4

from pydantic import BaseModel, Field, ValidationError

import app.coach  # noqa: F401  (registers the built-in tools and context blocks)
from app.ai import client as ai_client
from app.ai.client import AIError, AIQuotaError
from app.ai.style import STYLE_GUIDE
from app.coach import menu, registry
from app.coach.registry import Proposal, ToolContext, ToolError
from app.config.settings import get_settings
from app.models import coach as store

logger = logging.getLogger(__name__)

# Rounds of tool use per user message (read, then answer).
MAX_ROUNDS = 3
MAX_CALLS_PER_ROUND = 4
# Turns of history sent to the model, and how much of each.
HISTORY_TURNS = 12
HISTORY_CHARS = 600
# Messages returned when the coach opens.
LOAD_LIMIT = 60
# Stored history cap per user (oldest messages go first), and threads kept.
MAX_STORED_MESSAGES = 200
MAX_CONVERSATIONS = 10
# A confirm card older than this must be asked for again (data may have moved on).
PROPOSAL_TTL = timedelta(hours=2)
MAX_MESSAGE_CHARS = 6000
# Words per streamed token frame when the reply comes back whole.
STREAM_WORDS = 3

UNAVAILABLE_REPLY = "I can't reach the coaching model right now. Please try again in a minute."
QUOTA_REPLY = "You've reached today's limit for coach messages. It resets tomorrow."
CONFIRM_PROMPT = "Check the details below and confirm if they're right."
NO_ANSWER_REPLY = "I couldn't work that out. Could you say it another way?"

_PERSONA = (
    "You are FitMind's coach: an experienced fitness and nutrition coach who knows this "
    "person's data. Be direct and specific. Use their numbers. No generic encouragement.\n\n"
    + STYLE_GUIDE
)

_TOOL_RULES = """
Tools:
- Read tools fetch the person's data. Call them when the context below doesn't already answer.
- Action tools change data. Calling one only shows the person a confirm card; nothing changes
  until they tap confirm. Never say an action is done, logged or saved. Say what is ready to confirm.
- If something an action needs is missing (how much water, what they ate), ask one short question
  instead of guessing. Never make up amounts.
- If they paste a restaurant or delivery menu, or ask what to order from one, call suggest_from_menu
  with the menu text.
- Numbers you mention must come from the context or tool results.
- Answer with a JSON object: "reply" (what to say; may be empty while you wait for read results) and
  "tool_calls" (list of {"name", "args"}; empty when none are needed).

Available tools:
"""

_CONFIRM_CLAIM = re.compile(
    r"\b(i('ve| have)|has been|have been|it's|is now)\s+(logged|added|saved|swapped|started|recorded|updated|replaced)\b",
    re.I,
)


class CoachError(Exception):
    """A coach request can't be completed. ``code`` maps to an HTTP status."""

    def __init__(self, message: str, code: str = "invalid") -> None:
        super().__init__(message)
        self.code = code


class ToolCall(BaseModel):
    name: str = Field(..., max_length=60)
    args: Dict[str, Any] = Field(default_factory=dict)


class CoachTurn(BaseModel):
    reply: str = Field("", max_length=4000)
    tool_calls: List[ToolCall] = Field(default_factory=list, max_length=8)


# ---------------------------------------------------------------------------
# Model selection (see scripts/eval_coach_tools.py)
# ---------------------------------------------------------------------------
def coach_providers() -> Tuple[str, ...]:
    names = [p.strip() for p in get_settings().COACH_PROVIDERS.split(",") if p.strip()]
    valid = tuple(p for p in names if p in ai_client._PROVIDERS)
    return valid or ai_client.DEFAULT_PROVIDERS


def coach_models() -> Dict[str, str]:
    settings = get_settings()
    models = {ai_client.PROVIDER_GEMINI: settings.COACH_GEMINI_MODEL,
              ai_client.PROVIDER_GROQ: settings.COACH_GROQ_MODEL}
    return {k: v for k, v in models.items() if v}


def system_prompt() -> str:
    return _PERSONA + _TOOL_RULES + registry.catalog()


# ---------------------------------------------------------------------------
# Presentation
# ---------------------------------------------------------------------------
def _iso(value: Any) -> Optional[str]:
    return value.isoformat() if isinstance(value, datetime) else value


def public_proposal(doc: dict) -> dict:
    tool = registry.get(doc["tool"])
    result = doc.get("result") or {}
    return {
        "id": doc["id"],
        "tool": doc["tool"],
        "title": doc["title"],
        "summary": doc["summary"],
        "changes": doc.get("changes", []),
        "estimate": doc.get("estimate", False),
        "status": doc["status"],
        "result_message": result.get("message"),
        "invalidates": tool.invalidates if tool else [],
        "created_at": _iso(doc.get("created_at")),
    }


async def public_message(doc: dict, proposals: Optional[List[dict]] = None) -> dict:
    if proposals is None:
        proposals = await store.get_proposals(doc["user_id"], doc.get("proposal_ids", []))
    return {
        "id": doc["id"],
        "role": doc["role"],
        "kind": doc.get("kind", "text"),
        "content": doc["content"],
        "proposals": [public_proposal(p) for p in proposals],
        "created_at": _iso(doc["created_at"]),
    }


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------
async def _active_conversation(user_id: str) -> dict:
    return await store.get_active_conversation(user_id) or await store.create_conversation(user_id)


async def get_conversation(user_id: str) -> dict:
    """The active conversation with its latest messages (oldest first)."""
    conversation = await store.get_active_conversation(user_id)
    if conversation is None:
        return {"conversation_id": None, "messages": []}
    docs = await store.get_messages(user_id, conversation["id"], LOAD_LIMIT)
    return {
        "conversation_id": conversation["id"],
        "messages": [await public_message(d) for d in docs],
    }


async def new_conversation(user_id: str) -> dict:
    """Start a fresh chat; older threads beyond ``MAX_CONVERSATIONS`` are deleted."""
    conversation = await store.create_conversation(user_id)
    ids = await store.list_conversation_ids(user_id)
    await store.delete_conversations(user_id, ids[MAX_CONVERSATIONS:])
    return {"conversation_id": conversation["id"], "messages": []}


async def clear_history(user_id: str) -> None:
    """Delete every coach conversation, message and proposal of the user."""
    await store.delete_all(user_id)


async def _add(user_id: str, conversation_id: str, role: str, content: str,
               proposal_ids: Optional[List[str]] = None, kind: str = "text") -> dict:
    doc = await store.add_message(user_id, conversation_id, role, content, proposal_ids, kind)
    await store.attach_message(user_id, proposal_ids or [], doc["id"])
    await store.trim_messages(user_id, MAX_STORED_MESSAGES)
    return doc


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
async def _history_text(user_id: str, conversation_id: str, exclude_id: str) -> str:
    docs = [d for d in await store.get_messages(user_id, conversation_id, HISTORY_TURNS + 1)
            if d["id"] != exclude_id][-HISTORY_TURNS:]
    lines = []
    for d in docs:
        who = "Person" if d["role"] == "user" else "Coach"
        text = d["content"][:HISTORY_CHARS]
        proposals = await store.get_proposals(user_id, d.get("proposal_ids", []))
        if proposals:
            text += " [cards: " + "; ".join(f"{p['title']} ({p['status']})" for p in proposals) + "]"
        lines.append(f"{who}: {text}")
    return "\n".join(lines)


def _prompt(context: str, history: str, message: str, results: List[dict]) -> str:
    parts = [f"Context about this person (today):\n{context}"]
    if history:
        parts.append(f"Conversation so far:\n{history}")
    parts.append(f"Latest message from the person:\n{message}")
    if results:
        rendered = json.dumps(results, default=str, separators=(",", ":"))[:8000]
        parts.append(
            "Tool results for this message (cards already shown are listed as proposed; "
            f"don't propose them again):\n{rendered}\n"
            "Now answer the person. Only call more tools if you still need data."
        )
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Tool dispatch
# ---------------------------------------------------------------------------
async def _store_proposal(user_id: str, conversation_id: str, tool_name: str, proposal: Proposal) -> dict:
    return await store.save_proposal({
        "id": str(uuid4()),
        "user_id": user_id,
        "conversation_id": conversation_id,
        "tool": tool_name,
        "title": proposal.title,
        "summary": proposal.summary,
        "changes": [c.model_dump() for c in proposal.changes],
        "estimate": proposal.estimate,
        "payload": proposal.payload,
    })


class _Turn:
    """What one user message produced so far."""

    def __init__(self) -> None:
        self.results: List[dict] = []
        self.proposals: List[dict] = []
        self.fixed_reply: Optional[str] = None
        self.seen: set = set()


async def dispatch(user_id: str, conversation_id: str, calls: List[ToolCall], turn: _Turn) -> bool:
    """Run read tools and prepare action proposals. True if the model needs another look."""
    ctx = ToolContext(user_id=user_id)
    needs_followup = False
    for call in calls[:MAX_CALLS_PER_ROUND]:
        key = f"{call.name}:{json.dumps(call.args, sort_keys=True, default=str)}"
        if key in turn.seen:
            continue
        turn.seen.add(key)
        tool = registry.get(call.name)
        if tool is None:
            turn.results.append({"tool": call.name, "error": "unknown tool"})
            needs_followup = True
            continue
        try:
            args = tool.args.model_validate(call.args)
        except ValidationError as e:
            problems = "; ".join(
                f"{'.'.join(str(p) for p in err['loc']) or 'args'}: {err['msg']}" for err in e.errors()[:3]
            )
            turn.results.append({"tool": call.name, "error": f"missing or invalid: {problems}"})
            needs_followup = True
            continue
        try:
            if tool.kind == "read":
                output = dict(await tool.run(ctx, args))
                for name, proposal in output.pop("propose", []):
                    turn.proposals.append(await _store_proposal(user_id, conversation_id, name, proposal))
                if output.get("reply"):
                    turn.fixed_reply = output.pop("reply")
                turn.results.append({"tool": call.name, "result": output})
                needs_followup = True
            else:
                proposal = await tool.prepare(ctx, args)
                turn.proposals.append(await _store_proposal(user_id, conversation_id, tool.name, proposal))
                turn.results.append({"tool": call.name, "proposed": proposal.summary})
        except ToolError as e:
            turn.results.append({"tool": call.name, "error": str(e)})
            needs_followup = True
        except AIQuotaError:
            raise
        except Exception as e:  # A broken tool is reported, never fatal to the chat.
            logger.warning("Coach tool %s failed for %s: %s", call.name, user_id, e)
            turn.results.append({"tool": call.name, "error": "that didn't work, try again"})
            needs_followup = True
    return needs_followup


def _final_reply(model_reply: str, turn: _Turn) -> str:
    if turn.fixed_reply:
        return turn.fixed_reply
    reply = model_reply.strip()
    if turn.proposals and (not reply or _CONFIRM_CLAIM.search(reply)):
        # Never let the model claim it changed anything; the card is the source of truth.
        return CONFIRM_PROMPT
    if reply:
        return reply
    errors = [r["error"] for r in turn.results if "error" in r and r["error"] != "unknown tool"]
    return errors[0] if errors else NO_ANSWER_REPLY


def _chunks(text: str) -> List[str]:
    words = re.split(r"(\s+)", text)
    size = STREAM_WORDS * 2
    return ["".join(words[i:i + size]) for i in range(0, len(words), size)]


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
async def respond(user_id: str, message: str) -> AsyncIterator[Dict[str, Any]]:
    """Answer one user message, yielding socket-ready events.

    Events: ``{"type": "start"}``, ``{"type": "token", "content"}`` (one or
    more), then ``{"type": "done", "content", "message_id", "proposals"}``.
    The user's message and the reply are stored in the active conversation.
    """
    message = message.strip()[:MAX_MESSAGE_CHARS]
    conversation = await _active_conversation(user_id)
    conversation_id = conversation["id"]
    user_doc = await _add(user_id, conversation_id, "user", message)
    yield {"type": "start", "user_message_id": user_doc["id"]}

    context = await registry.build_context(user_id)
    history = await _history_text(user_id, conversation_id, user_doc["id"])
    turn = _Turn()
    reply = ""
    try:
        for round_index in range(MAX_ROUNDS):
            step = await ai_client.generate_json(
                _prompt(context, history, message, turn.results),
                CoachTurn,
                system=system_prompt(),
                temperature=0.2,
                user_id=user_id,
                providers=coach_providers(),
                models=coach_models(),
            )
            reply = step.reply
            needs_followup = await dispatch(user_id, conversation_id, step.tool_calls, turn)
            if turn.fixed_reply or not needs_followup:
                break
        else:
            reply = ""  # Still asking for tools after the last round.
        reply = _final_reply(reply, turn)
        for chunk in _chunks(reply):
            yield {"type": "token", "content": chunk}
    except AIQuotaError:
        reply = _final_reply("", turn) if turn.proposals or turn.fixed_reply else QUOTA_REPLY
        yield {"type": "token", "content": reply}
    except AIError as e:
        logger.warning("Coach tool use unavailable for %s: %s", user_id, e)
        if turn.proposals or turn.fixed_reply:
            reply = _final_reply("", turn)
            yield {"type": "token", "content": reply}
        else:
            reply = ""
            async for token in _plain_reply(user_id, context, history, message):
                reply += token
                yield {"type": "token", "content": token}

    proposal_ids = [p["id"] for p in turn.proposals]
    doc = await _add(user_id, conversation_id, "assistant", reply, proposal_ids)
    yield {
        "type": "done",
        "content": reply,
        "message_id": doc["id"],
        "conversation_id": conversation_id,
        "proposals": [public_proposal(p) for p in turn.proposals],
    }


async def _plain_reply(user_id: str, context: str, history: str, message: str) -> AsyncIterator[str]:
    """No tools: stream a plain answer (the coach's original behaviour)."""
    system = _PERSONA + "\nContext about this person (today):\n" + context
    if history:
        system += "\n\nConversation so far:\n" + history
    messages = [{"role": "system", "content": system}, {"role": "user", "content": message}]
    try:
        async for token in ai_client.stream_chat(messages, user_id=user_id):
            yield token
    except AIQuotaError:
        yield QUOTA_REPLY
    except AIError as e:
        logger.warning("Chat unavailable for user %s: %s", user_id, e)
        yield UNAVAILABLE_REPLY


async def reply_once(user_id: str, message: str) -> dict:
    """Non-streaming chat: run :func:`respond` and return the stored reply."""
    final: Dict[str, Any] = {}
    async for event in respond(user_id, message):
        if event["type"] == "start":
            final["user_message_id"] = event["user_message_id"]
        elif event["type"] == "done":
            final.update(event)
    return {
        "conversation_id": final["conversation_id"],
        "user_message_id": final.get("user_message_id"),
        "message_id": final["message_id"],
        "content": final["content"],
        "proposals": final["proposals"],
    }


async def generate_chat_response(user_id: str, message: str) -> AsyncIterator[str]:
    """Reply text only (kept for callers that just want tokens)."""
    async for event in respond(user_id, message):
        if event["type"] == "token":
            yield event["content"]


# ---------------------------------------------------------------------------
# Menu ("What should I order?")
# ---------------------------------------------------------------------------
async def menu_advice(
    user_id: str, text: Optional[str], image: Optional[bytes] = None, mime_type: Optional[str] = None
) -> dict:
    """Best picks from a typed, pasted or photographed menu, stored in the chat.

    Returns the stored user and assistant messages.

    Raises:
        CoachError: if there's no menu, the photo can't be read, or nothing
            on it can be estimated.
    """
    menu_text = (text or "").strip()
    if image:
        try:
            read = await menu.read_menu_photo(user_id, image, mime_type or "image/jpeg")
        except AIQuotaError as e:
            raise CoachError(QUOTA_REPLY, "quota") from e
        except AIError as e:
            logger.info("Menu photo unreadable for %s: %s", user_id, e)
            raise CoachError("Couldn't read that photo. Paste or type the menu instead.") from e
        menu_text = f"{menu_text}\n{read}".strip()
    if len(menu_text) < 3:
        raise CoachError("Paste or type the menu first.")

    conversation = await _active_conversation(user_id)
    try:
        result = await menu.suggest(user_id, menu_text)
    except AIQuotaError as e:
        raise CoachError(QUOTA_REPLY, "quota") from e
    except ToolError as e:
        raise CoachError(str(e)) from e
    label = "What should I order from this menu?" + ("" if not text else f"\n\n{text.strip()[:2000]}")
    user_doc = await _add(user_id, conversation["id"], "user", label, kind="menu")
    proposals = [await _store_proposal(user_id, conversation["id"], "log_meal", p) for p in result["proposals"]]
    doc = await _add(user_id, conversation["id"], "assistant", result["reply"],
                     [p["id"] for p in proposals], kind="menu")
    return {
        "conversation_id": conversation["id"],
        "user_message": await public_message(user_doc, []),
        "message": await public_message(doc, proposals),
        "options": result["options"],
    }


# ---------------------------------------------------------------------------
# Confirm and cancel
# ---------------------------------------------------------------------------
def _expired(doc: dict) -> bool:
    created = doc.get("created_at")
    if not isinstance(created, datetime):
        return False
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - created > PROPOSAL_TTL


async def _pending(user_id: str, proposal_id: str) -> dict:
    doc = await store.get_proposal(user_id, proposal_id)
    if doc is None:
        raise CoachError("That action wasn't found.", "not_found")
    if doc["status"] != store.STATUS_PENDING:
        raise CoachError(f"That action is already {doc['status']}.", "conflict")
    if _expired(doc):
        await store.transition(user_id, proposal_id, store.STATUS_PENDING, store.STATUS_EXPIRED)
        raise CoachError("That card has expired. Ask again and I'll set it up fresh.", "conflict")
    return doc


async def confirm_action(user_id: str, proposal_id: str) -> dict:
    """Run a proposed action from its stored payload.

    Returns the updated proposal, the stored confirmation message (worded from
    the backend's result) and the query domains the app should refresh. A
    service failure is reported as a ``failed`` proposal with the reason.

    Raises:
        CoachError: if the proposal doesn't exist, isn't pending, or expired.
    """
    doc = await _pending(user_id, proposal_id)
    tool = registry.get(doc["tool"])
    if tool is None or tool.kind != "action":
        raise CoachError("That action is no longer available.", "conflict")
    claimed = await store.transition(user_id, proposal_id, store.STATUS_PENDING, store.STATUS_EXECUTING)
    if claimed is None:
        raise CoachError("That action is already being handled.", "conflict")

    ctx = ToolContext(user_id=user_id)
    try:
        result = await tool.execute(ctx, doc["payload"])
    except ToolError as e:
        message, status, data = str(e), store.STATUS_FAILED, {}
    except Exception as e:
        logger.warning("Coach action %s failed for %s: %s", doc["tool"], user_id, e)
        message, status, data = "That didn't go through. Nothing was changed. Try again.", store.STATUS_FAILED, {}
    else:
        message, status, data = result.message, store.STATUS_DONE, result.data

    updated = await store.transition(
        user_id, proposal_id, store.STATUS_EXECUTING, status, {"message": message}
    ) or {**claimed, "status": status, "result": {"message": message}}
    msg = await _add(user_id, doc["conversation_id"], "assistant", message, kind="action_result")
    invalidates = tool.invalidates if status == store.STATUS_DONE else []
    return {
        "proposal": public_proposal(updated),
        "message": await public_message(msg, []),
        "invalidate": invalidates,
        "data": data,
    }


async def cancel_action(user_id: str, proposal_id: str) -> dict:
    """Dismiss a proposed action without running it."""
    await _pending(user_id, proposal_id)
    updated = await store.transition(user_id, proposal_id, store.STATUS_PENDING, store.STATUS_CANCELLED)
    if updated is None:
        raise CoachError("That action is already being handled.", "conflict")
    return {"proposal": public_proposal(updated)}
