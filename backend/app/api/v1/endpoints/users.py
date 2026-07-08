from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.user import UserOnboarding, UserProfileUpdate
from app.services import user_service
from app.services.user_service import UserServiceError

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/onboarding", response_model=SuccessResponse)
async def onboard_user(
    data: UserOnboarding, current_user: User = Depends(get_current_user)
) -> dict:
    """Complete onboarding for the authenticated user and store their profile."""
    try:
        user = await user_service.complete_onboarding(current_user.id, data.model_dump())
    except UserServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {
        "success": True,
        "message": "Onboarding completed",
        "data": {
            "bmi": user.bmi,
            "tdee": user.tdee,
            "profile_created": True,
        },
    }


@router.get("/profile", response_model=SuccessResponse)
async def get_profile(current_user: User = Depends(get_current_user)) -> dict:
    """Return the authenticated user's full profile."""
    try:
        user = await user_service.get_user_profile(current_user.id)
    except UserServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {
        "success": True,
        "message": "Profile retrieved",
        "data": user.public_dict(),
    }


@router.put("/profile", response_model=SuccessResponse)
async def update_profile(
    data: UserProfileUpdate, current_user: User = Depends(get_current_user)
) -> dict:
    """Apply a partial update to the authenticated user's profile."""
    try:
        user = await user_service.update_user_profile(current_user.id, data.model_dump())
    except UserServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {
        "success": True,
        "message": "Profile updated",
        "data": user.public_dict(),
    }
