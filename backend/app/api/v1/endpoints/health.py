from fastapi import APIRouter

from app.config.settings import get_settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def api_health_check() -> dict:
    """Return API-level health status for the v1 router."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": "FitMind AI API",
        "version": settings.APP_VERSION,
    }
