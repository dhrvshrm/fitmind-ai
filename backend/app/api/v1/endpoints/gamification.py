from fastapi import APIRouter, Depends

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.services import gamification_service

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/profile", response_model=SuccessResponse)
async def get_profile(current_user: User = Depends(get_current_user)) -> dict:
    """Return the user's XP, level, title, streak and badges."""
    profile = await gamification_service.get_gamification_profile(current_user.id)
    return {
        "success": True,
        "message": "Gamification profile retrieved",
        "data": profile,
    }


@router.get("/badges", response_model=SuccessResponse)
async def get_badges(current_user: User = Depends(get_current_user)) -> dict:
    """Return the user's earned badges alongside the full badge catalog."""
    profile = await gamification_service.get_gamification_profile(current_user.id)
    return {
        "success": True,
        "message": "Badges retrieved",
        "data": {
            "earned": profile["badges"],
            "all_badges": gamification_service.list_all_badges(),
        },
    }
