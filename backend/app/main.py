from fastapi import FastAPI
import logging

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

app = FastAPI(
    title="FitMind AI API",
    description="AI-powered fitness coach. All responses use the envelope "
    "`{success: bool, message: str, data: any}`.",
    version="1.0.0",
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

@app.on_event("startup")
async def startup_event():
    logger.info("Starting FitMind AI Backend...")
    try:
        await connect_to_mongo()
        logger.info("Backend startup complete")
    except Exception as e:
        logger.info(f"MongoDB connection will be set up on Day 5")
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down...")
    stop_scheduler()
    await close_mongo_connection()

@app.get("/")
async def root():
    return {
        "service": "FitMind AI API",
        "version": "0.1.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "FitMind AI Backend"}
