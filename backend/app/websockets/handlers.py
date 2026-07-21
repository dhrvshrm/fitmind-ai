import logging
from typing import Any, Dict

from app.services import chat_service
from app.websockets.manager import manager

logger = logging.getLogger(__name__)


async def chat_handler(user_id: str, message: str) -> None:
    """Stream an AI chat reply to the user over their WebSocket connection.

    Emits a ``start`` frame, a ``token`` frame per streamed chunk, and a
    final ``done`` frame carrying the full assembled reply.
    """
    await manager.send_personal(user_id, {"type": "start"})
    full_reply = ""
    try:
        async for token in chat_service.generate_chat_response(user_id, message):
            full_reply += token
            await manager.send_personal(user_id, {"type": "token", "content": token})
    except Exception as e:
        logger.warning("chat_handler error for user=%s: %s", user_id, e)
        await manager.send_personal(
            user_id, {"type": "error", "content": "Chat failed. Please try again."}
        )
        return
    await manager.send_personal(user_id, {"type": "done", "content": full_reply})


async def notification_handler(event: str, user_id: str, payload: Dict[str, Any] | None = None) -> None:
    """Push a notification event to a user's active connections.

    Used by other services (e.g. gamification) to notify a user of things
    like a new badge or level-up in real time.
    """
    await manager.send_personal(
        user_id,
        {"type": "notification", "event": event, "data": payload or {}},
    )
