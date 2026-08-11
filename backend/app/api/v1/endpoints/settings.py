from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import DEFAULT_NOTIFICATION_PREFERENCES, User
from app.schemas.general import SuccessResponse
from app.schemas.settings import (
    ChangePasswordRequest,
    GoalsUpdateRequest,
    NotificationPreferencesUpdate,
    ProfileUpdateRequest,
)
from app.services import settings_service
from app.services.settings_service import SettingsError

router = APIRouter(prefix="/settings", tags=["Settings"])


def _error_code(exc: SettingsError) -> int:
    """Map a settings error to 404 (not found) or 400 (bad request)."""
    return (
        status.HTTP_404_NOT_FOUND
        if "not found" in str(exc).lower()
        else status.HTTP_400_BAD_REQUEST
    )


@router.get("/profile", response_model=SuccessResponse)
async def get_profile(current_user: User = Depends(get_current_user)) -> dict:
    """Return the current user's full profile and preferences."""
    user = await settings_service.get_profile(current_user.id)
    return {
        "success": True,
        "message": "Profile retrieved",
        "data": user.public_dict(),
    }


@router.put("/profile", response_model=SuccessResponse)
async def update_profile(
    payload: ProfileUpdateRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Update the current user's editable profile fields."""
    try:
        user = await settings_service.update_profile(
            current_user.id, payload.model_dump(exclude_none=True)
        )
    except SettingsError as exc:
        raise HTTPException(status_code=_error_code(exc), detail=str(exc)) from exc
    return {"success": True, "message": "Profile updated", "data": user.public_dict()}


@router.put("/goals", response_model=SuccessResponse)
async def update_goals(
    payload: GoalsUpdateRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Update the current user's fitness goal / experience / equipment."""
    try:
        user = await settings_service.update_fitness_goals(
            current_user.id, payload.model_dump(exclude_none=True)
        )
    except SettingsError as exc:
        raise HTTPException(status_code=_error_code(exc), detail=str(exc)) from exc
    return {"success": True, "message": "Goals updated", "data": user.public_dict()}


@router.put("/preferences", response_model=SuccessResponse)
async def update_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Update notification preference toggles."""
    try:
        prefs = await settings_service.update_notification_preferences(
            current_user.id, payload.model_dump(exclude_none=True)
        )
    except SettingsError as exc:
        raise HTTPException(status_code=_error_code(exc), detail=str(exc)) from exc
    return {
        "success": True,
        "message": "Preferences updated",
        "data": {"preferences": {**DEFAULT_NOTIFICATION_PREFERENCES, **prefs}},
    }


@router.put("/password", response_model=SuccessResponse)
async def change_password(
    payload: ChangePasswordRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Change the current user's password."""
    try:
        await settings_service.change_password(
            current_user.id, payload.current_password, payload.new_password
        )
    except SettingsError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "message": "Password changed", "data": None}


@router.delete("/account", response_model=SuccessResponse)
async def delete_account(current_user: User = Depends(get_current_user)) -> dict:
    """Permanently delete the current user's account."""
    try:
        await settings_service.delete_account(current_user.id)
    except SettingsError as exc:
        raise HTTPException(status_code=_error_code(exc), detail=str(exc)) from exc
    return {"success": True, "message": "Account deleted", "data": None}
