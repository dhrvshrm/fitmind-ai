from fastapi import APIRouter, Depends, Query

from app.api.v1.endpoints.auth import get_current_user
from app.models.gamification import XP_REWARDS
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.recovery import RecoveryLogRequest
from app.services import gamification_service, recovery_service

router = APIRouter(prefix="/recovery", tags=["Recovery"])


@router.post("/log", response_model=SuccessResponse)
async def log_recovery(
    payload: RecoveryLogRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Log today's recovery metrics, award XP, and return the computed score."""
    log = await recovery_service.log_recovery(current_user.id, payload.model_dump())
    xp = await gamification_service.award_xp(current_user.id, XP_REWARDS["recovery"])
    new_badges = await gamification_service.check_badge_conditions(current_user.id)
    return {
        "success": True,
        "message": "Recovery logged",
        "data": {
            "recovery_score": log.score,
            "recommendation": recovery_service.get_recommendation(log.score),
            "xp_earned": xp["xp_earned"],
            "new_badges": new_badges,
        },
    }


@router.get("/score/today", response_model=SuccessResponse)
async def get_today_recovery_score(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the user's most recent recovery score with guidance."""
    score = await recovery_service.get_recovery_score(current_user.id)
    return {
        "success": True,
        "message": "Recovery score retrieved",
        "data": {
            "score": score,
            "recommendation": recovery_service.get_recommendation(score),
            "explanation": recovery_service.get_explanation(score),
        },
    }


@router.get("/history", response_model=SuccessResponse)
async def get_recovery_history(
    days: int = Query(14, ge=1, le=90),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the user's recovery history (newest first)."""
    logs = await recovery_service.get_recovery_history(current_user.id, days=days)
    return {
        "success": True,
        "message": "Recovery history retrieved",
        "data": {
            "history": [{"date": log.log_date, "score": log.score} for log in logs],
        },
    }
