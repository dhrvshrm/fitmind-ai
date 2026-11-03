import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.models.user import User
from app.services import auth_service, notification_service
from app.services.auth_service import AuthError
from app.utils.time import set_current_timezone
from app.websockets.handlers import chat_handler
from app.websockets.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()

# Seconds a new socket has to authenticate before it is closed.
AUTH_TIMEOUT_SECONDS = 10
# Close code sent when authentication fails (4000-4999 are app-defined).
CLOSE_UNAUTHORIZED = 4401


async def _authenticate(websocket: WebSocket) -> Optional[User]:
    """Wait for the client's ``auth`` frame and resolve its user.

    The token travels in the first frame, not the URL, so it never shows up
    in server or proxy access logs. Returns ``None`` on any failure.
    """
    try:
        frame = await asyncio.wait_for(websocket.receive_json(), AUTH_TIMEOUT_SECONDS)
    except (asyncio.TimeoutError, WebSocketDisconnect, ValueError):
        return None
    if not isinstance(frame, dict) or frame.get("type") != "auth":
        return None
    try:
        return await auth_service.get_user_from_token(str(frame.get("token") or ""))
    except AuthError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Real-time chat/notification channel for the authenticated user.

    Protocol (JSON frames):
      client -> {"type": "auth", "token": "<jwt>"}         must be the first frame
      server -> {"type": "ready"}                          auth accepted
      client -> {"type": "message", "content": "..."}      triggers a streamed reply
      client -> {"type": "ping"}                           health check
      server -> {"type": "start"} / {"type": "token", "content"} / {"type": "done"}
      server -> {"type": "notification", "data": {...}}    live + pending on connect
    """
    await websocket.accept()
    user = await _authenticate(websocket)
    if user is None:
        await websocket.close(code=CLOSE_UNAUTHORIZED)
        return

    user_id = user.id
    set_current_timezone(user.timezone)
    manager.register(user_id, websocket)
    await websocket.send_json({"type": "ready"})
    # Deliver any notifications that arrived while the user was offline.
    await notification_service.deliver_pending(user_id)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "message":
                content = (data.get("content") or "").strip()
                if content:
                    await chat_handler(user_id, content, websocket)
                else:
                    await websocket.send_json({"type": "error", "content": "Empty message"})
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                await websocket.send_json(
                    {"type": "error", "content": f"Unknown message type: {msg_type}"}
                )
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.warning("WebSocket error for user=%s: %s", user_id, e)
        manager.disconnect(user_id, websocket)
