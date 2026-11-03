from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from app.config.database import connect_to_mongo, close_mongo_connection
from app.config.cors import setup_cors
from app.config.settings import get_settings
from app.api.v1.router import router as v1_router
from app.api.v1.websockets import router as ws_router
from app.background_jobs.jobs import start_scheduler, stop_scheduler
from app.middleware.error_handlers import register_exception_handlers
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Start and stop the database connection and background scheduler."""
    logger.info("Starting FitMind AI Backend (%s)...", _settings.DATABASE_ENV)
    # Both raise in production on unsafe config or an unreachable database,
    # so a broken deploy fails its health check instead of serving bad data.
    _settings.validate_for_production()
    await connect_to_mongo()
    start_scheduler()
    logger.info("Backend startup complete")
    yield
    logger.info("Shutting down...")
    stop_scheduler()
    await close_mongo_connection()


app = FastAPI(
    title="FitMind AI API",
    description="AI-powered fitness coach. All responses use the envelope "
    "`{success: bool, message: str, data: any}`.",
    version=_settings.APP_VERSION,
    debug=_settings.DEBUG,
    lifespan=lifespan,
)

# Middleware runs bottom-to-top on the way in: rate limit first, then logging.
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    RateLimitMiddleware,
    max_requests=_settings.RATE_LIMIT_MAX_REQUESTS,
    window_seconds=_settings.RATE_LIMIT_WINDOW_SECONDS,
)
setup_cors(app)
register_exception_handlers(app)
app.include_router(v1_router)
app.include_router(ws_router)


@app.get("/")
async def root():
    return {
        "service": "FitMind AI API",
        "version": _settings.APP_VERSION,
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "FitMind AI Backend"}
