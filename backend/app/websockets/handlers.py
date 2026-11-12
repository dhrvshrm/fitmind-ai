import logging
from typing import Any, Dict, List

from fastapi import WebSocket

from app.services import chat_service
from app.websockets.manager import manager

logger = logging.getLogger(__name__)


async def chat_handler(user_id: str, message: str, websocket: WebSocket) -> None:
    """Stream the coach's reply back to the socket that asked.

    Emits ``start``, a ``token`` frame per chunk, then ``done`` with the full
    reply, the stored message id and any action proposals (confirm cards).
    Replies go only to the requesting socket, not every connection the user
    has open (the notifications socket and other tabs shouldn't get tokens).
    """
    started = False
    try:
        async for event in chat_service.respond(user_id, message):
            started = started or event["type"] == "start"
            await websocket.send_json(event)
    except Exception as e:
        logger.warning("chat_handler error for user=%s: %s", user_id, e)
        if not started:
            await websocket.send_json({"type": "start"})
        await websocket.send_json({"type": "error", "content": "Chat failed. Please try again."})


async def invalidate_handler(user_id: str, domains: List[str]) -> None:
    """Tell every open app tab which data an action changed, so it refetches."""
    if domains:
        await manager.send_personal(user_id, {"type": "invalidate", "domains": domains})


async def notification_handler(event: str, user_id: str, payload: Dict[str, Any] | None = None) -> None:
    """Push a notification event to a user's active connections.

    Used by other services (e.g. gamification) to notify a user of things
    like a new badge or level-up in real time.
    """
    await manager.send_personal(
        user_id,
        {"type": "notification", "event": event, "data": payload or {}},
    )
