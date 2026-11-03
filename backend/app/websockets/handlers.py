import logging
from typing import Any, Dict

from fastapi import WebSocket

from app.services import chat_service
from app.websockets.manager import manager

logger = logging.getLogger(__name__)


async def chat_handler(user_id: str, message: str, websocket: WebSocket) -> None:
    """Stream an AI chat reply back to the socket that asked.

    Emits a ``start`` frame, a ``token`` frame per streamed chunk, and a
    final ``done`` frame carrying the full assembled reply. Replies go only
    to the requesting socket, not every connection the user has open (the
    notifications socket and other tabs shouldn't receive chat tokens).
    """
    await websocket.send_json({"type": "start"})
    full_reply = ""
    try:
        async for token in chat_service.generate_chat_response(user_id, message):
            full_reply += token
            await websocket.send_json({"type": "token", "content": token})
    except Exception as e:
        logger.warning("chat_handler error for user=%s: %s", user_id, e)
        await websocket.send_json({"type": "error", "content": "Chat failed. Please try again."})
        return
    await websocket.send_json({"type": "done", "content": full_reply})


async def notification_handler(event: str, user_id: str, payload: Dict[str, Any] | None = None) -> None:
    """Push a notification event to a user's active connections.

    Used by other services (e.g. gamification) to notify a user of things
    like a new badge or level-up in real time.
    """
    await manager.send_personal(
        user_id,
        {"type": "notification", "event": event, "data": payload or {}},
    )
