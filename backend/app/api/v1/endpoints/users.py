from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.user import (
    PersonalisationUpdate,
    TargetsPreviewRequest,
    UserOnboarding,
    UserProfileUpdate,
)
from app.services import user_service
from app.services import analytics_service, setup_service
from app.services.user_service import UserServiceError

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/onboarding", response_model=SuccessResponse)
async def onboard_user(
    data: UserOnboarding,
    setup: bool = Query(False, description="Also build the meal and workout plans (instant setup)"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Complete onboarding for the authenticated user and store their profile.

    With ``?setup=true`` (the app sends it at the end of first-time onboarding)
    the meal plan and workout plan are built straight away; ``data.setup``
    reports each as ``created``, ``pending`` or ``failed``. That step never
    makes onboarding fail.
    """
    first_time = not current_user.onboarding_completed
    try:
        user = await user_service.complete_onboarding(current_user.id, data.model_dump())
    except UserServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    await analytics_service.track(
        user.id, analytics_service.ONBOARDING_COMPLETED, {"status": "first" if first_time else "repeat"}
    )
    setup_result = await setup_service.run(user) if setup else None
    return {
        "success": True,
        "message": "Onboarding completed",
        "data": {
            "bmi": user.bmi,
            "tdee": user.tdee,
            "targets": user.targets,
            "profile_created": True,
            "setup": setup_result,
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


@router.put("/personalisation", response_model=SuccessResponse)
async def update_personalisation(
    data: PersonalisationUpdate, current_user: User = Depends(get_current_user)
) -> dict:
    """Update goal details and food, budget and routine answers; targets are recomputed.

    Only the sections and fields sent are changed.
    """
    try:
        user = await user_service.update_personalisation(
            current_user.id, data.model_dump(exclude_none=True)
        )
    except UserServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"success": True, "message": "Preferences updated", "data": user.public_dict()}


@router.get("/targets", response_model=SuccessResponse)
async def get_targets(current_user: User = Depends(get_current_user)) -> dict:
    """Daily calorie, macro, fiber and water targets, with how they were worked out."""
    targets = await user_service.get_targets(current_user)
    return {"success": True, "message": "Targets retrieved", "data": {"targets": targets}}


@router.post("/targets/preview", response_model=SuccessResponse)
async def preview_targets(
    data: TargetsPreviewRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Targets for answers that haven't been saved yet (onboarding review step)."""
    targets = user_service.preview_targets(data.model_dump())
    return {"success": True, "message": "Targets calculated", "data": {"targets": targets.model_dump()}}
