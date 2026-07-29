from fastapi import APIRouter, Depends

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=SuccessResponse)
async def get_summary(current_user: User = Depends(get_current_user)) -> dict:
    """Return today's headline dashboard metrics."""
    data = await dashboard_service.get_dashboard_summary(current_user.id)
    return {"success": True, "message": "Dashboard summary retrieved", "data": data}


@router.get("/mood-performance", response_model=SuccessResponse)
async def get_mood_performance(current_user: User = Depends(get_current_user)) -> dict:
    """Return mood/energy performance over the last 30 days (Recharts-ready)."""
    data = await dashboard_service.get_mood_performance_data(current_user.id)
    return {"success": True, "message": "Mood performance retrieved", "data": data}


@router.get("/weight-trend", response_model=SuccessResponse)
async def get_weight_trend(current_user: User = Depends(get_current_user)) -> dict:
    """Return the body-weight trend over the last 90 days (Recharts-ready)."""
    data = await dashboard_service.get_weight_trend(current_user.id)
    return {"success": True, "message": "Weight trend retrieved", "data": data}


@router.get("/workout-rate", response_model=SuccessResponse)
async def get_workout_rate(current_user: User = Depends(get_current_user)) -> dict:
    """Return workout completion data over the last 30 days (Recharts-ready)."""
    data = await dashboard_service.get_workout_completion_rate(current_user.id)
    return {"success": True, "message": "Workout completion retrieved", "data": data}


@router.get("/xp-weekly", response_model=SuccessResponse)
async def get_xp_weekly(current_user: User = Depends(get_current_user)) -> dict:
    """Return XP earned per day over the last 7 days (Recharts-ready)."""
    data = await dashboard_service.get_xp_earned_weekly(current_user.id)
    return {"success": True, "message": "Weekly XP retrieved", "data": data}


@router.get("/recovery-trend", response_model=SuccessResponse)
async def get_recovery_trend(current_user: User = Depends(get_current_user)) -> dict:
    """Return the recovery-score trend over the last 14 days (Recharts-ready)."""
    data = await dashboard_service.get_recovery_trend(current_user.id)
    return {"success": True, "message": "Recovery trend retrieved", "data": data}
