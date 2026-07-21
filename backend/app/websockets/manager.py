import logging
from typing import Any, Dict, List, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks active WebSocket connections keyed by user id.

    A user may have several concurrent connections (e.g. multiple tabs), so
    each user id maps to a set of sockets.
    """

    def __init__(self) -> None:
        """Initialise an empty registry of active connections."""
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """Accept a socket and register it under ``user_id``."""
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)
        logger.info("WS connected: user=%s (total=%d)", user_id, self.connection_count)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        """Remove a socket for ``user_id``, dropping the user when empty."""
        sockets = self._connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(user_id, None)
        logger.info("WS disconnected: user=%s (total=%d)", user_id, self.connection_count)

    async def send_personal(self, user_id: str, message: Dict[str, Any]) -> None:
        """Send a JSON message to all of a user's active connections.

        Sockets that fail to receive are pruned.
        """
        dead: List[WebSocket] = []
        for socket in list(self._connections.get(user_id, set())):
            try:
                await socket.send_json(message)
            except Exception as e:
                logger.warning("WS send failed for user=%s: %s", user_id, e)
                dead.append(socket)
        for socket in dead:
            self.disconnect(user_id, socket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """Send a JSON message to every connected user."""
        for user_id in list(self._connections.keys()):
            await self.send_personal(user_id, message)

    def is_connected(self, user_id: str) -> bool:
        """Return True if the user has at least one active connection."""
        return bool(self._connections.get(user_id))

    @property
    def connection_count(self) -> int:
        """Total number of active sockets across all users."""
        return sum(len(s) for s in self._connections.values())


# Shared singleton used by the WebSocket endpoint and handlers.
manager = ConnectionManager()
