import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def _envelope(message: str, data=None) -> dict:
    """Build the standard response envelope ``{success, message, data}``."""
    return {"success": False, "message": message, "data": data}


def register_exception_handlers(app: FastAPI) -> None:
    """Register handlers that normalise every error into the API envelope.

    Without these, FastAPI returns ``{"detail": ...}`` for HTTP and validation
    errors, which is inconsistent with the success envelope. These handlers
    guarantee every response is ``{success, message, data}``.
    """

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """Return HTTPException detail inside the standard envelope."""
        message = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(message),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Return a readable first validation error plus the raw errors."""
        errors = exc.errors()
        first = errors[0] if errors else {}
        loc = ".".join(str(part) for part in first.get("loc", []) if part != "body")
        detail = first.get("msg", "Invalid request")
        message = f"{loc}: {detail}" if loc else detail
        logger.info("Validation error on %s %s: %s", request.method, request.url.path, message)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_envelope(message, {"errors": errors}),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        """Log unexpected errors and return a safe generic message."""
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope("An unexpected error occurred. Please try again."),
        )
