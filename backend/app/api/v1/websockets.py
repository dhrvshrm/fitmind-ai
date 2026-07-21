import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websockets.handlers import chat_handler
from app.websockets.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str) -> None:
    """Real-time chat/notification channel for a user.

    Protocol (JSON frames):
      client -> {"type": "message", "content": "..."}  triggers a streamed reply
      client -> {"type": "ping"}                        health check
      server -> {"type": "start"} / {"type": "token", "content"} / {"type": "done"}
    """
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "message":
                content = (data.get("content") or "").strip()
                if content:
                    await chat_handler(user_id, content)
                else:
                    await manager.send_personal(
                        user_id, {"type": "error", "content": "Empty message"}
                    )
            elif msg_type == "ping":
                await manager.send_personal(user_id, {"type": "pong"})
            else:
                await manager.send_personal(
                    user_id,
                    {"type": "error", "content": f"Unknown message type: {msg_type}"},
                )
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.warning("WebSocket error for user=%s: %s", user_id, e)
        manager.disconnect(user_id, websocket)
