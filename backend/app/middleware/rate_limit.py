import logging
import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window-ish sliding rate limiter keyed by client IP.

    Allows ``max_requests`` per ``window_seconds`` per IP. Uses an in-memory
    deque of request timestamps per IP (fine for a single process; a
    distributed deployment would back this with Redis). WebSocket upgrades and
    excluded paths bypass the limit.
    """

    def __init__(
        self,
        app,
        max_requests: int = 100,
        window_seconds: int = 60,
        exclude_paths: tuple = ("/health", "/", "/docs", "/openapi.json", "/redoc"),
    ) -> None:
        """Configure the limiter with a per-IP request budget and window."""
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.exclude_paths = exclude_paths
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def _client_ip(self, request: Request) -> str:
        """Resolve the client IP, honouring a proxy's X-Forwarded-For."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next):
        """Reject requests that exceed the per-IP budget with HTTP 429."""
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        now = time.monotonic()
        ip = self._client_ip(request)
        hits = self._hits[ip]

        # Drop timestamps outside the current window.
        cutoff = now - self.window_seconds
        while hits and hits[0] < cutoff:
            hits.popleft()

        if len(hits) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - hits[0])) + 1
            logger.warning("Rate limit exceeded for IP %s on %s", ip, request.url.path)
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": "Too many requests. Please slow down and try again.",
                    "data": None,
                },
                headers={"Retry-After": str(retry_after)},
            )

        hits.append(now)
        return await call_next(request)
