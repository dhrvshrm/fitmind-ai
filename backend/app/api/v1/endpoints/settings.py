from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import DEFAULT_NOTIFICATION_PREFERENCES, User
from app.schemas.general import SuccessResponse
from app.schemas.settings import (
    ChangePasswordRequest,
    NotificationPreferencesUpdate,
    ProfileUpdateRequest,
)
from app.services import auth_service, user_service
from app.services.auth_service import AuthError
from app.services.user_service import UserServiceError

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.put("/profile", response_model=SuccessResponse)
async def update_profile(
    payload: ProfileUpdateRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Update the current user's editable profile fields."""
    updates = payload.model_dump(exclude_none=True)
    try:
        user = await user_service.update_user_profile(current_user.id, updates)
    except UserServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {
        "success": True,
        "message": "Profile updated",
        "data": user.public_dict(),
    }


@router.get("/notifications", response_model=SuccessResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the current user's notification preferences."""
    prefs = {**DEFAULT_NOTIFICATION_PREFERENCES, **current_user.notification_preferences}
    return {
        "success": True,
        "message": "Notification preferences retrieved",
        "data": {"preferences": prefs},
    }


@router.put("/notifications", response_model=SuccessResponse)
async def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Update one or more notification preference toggles."""
    changes = payload.model_dump(exclude_none=True)
    merged = {**current_user.notification_preferences, **changes}
    await current_user.update({"notification_preferences": merged})
    return {
        "success": True,
        "message": "Notification preferences updated",
        "data": {"preferences": merged},
    }


@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    payload: ChangePasswordRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Change the current user's password."""
    try:
        await auth_service.change_password(
            current_user.id, payload.current_password, payload.new_password
        )
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "message": "Password changed", "data": None}


@router.delete("/account", response_model=SuccessResponse)
async def delete_account(current_user: User = Depends(get_current_user)) -> dict:
    """Permanently delete the current user's account."""
    try:
        await auth_service.delete_account(current_user.id)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"success": True, "message": "Account deleted", "data": None}
