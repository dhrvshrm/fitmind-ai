from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=SuccessResponse)
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the user's notifications (newest first) with the unread count."""
    items = await notification_service.get_notifications(current_user.id, limit=limit)
    unread = await notification_service.get_unread_count(current_user.id)
    return {
        "success": True,
        "message": "Notifications retrieved",
        "data": {
            "notifications": [n.public_dict() for n in items],
            "unread_count": unread,
        },
    }


@router.post("/{notification_id}/read", response_model=SuccessResponse)
async def mark_notification_read(
    notification_id: str, current_user: User = Depends(get_current_user)
) -> dict:
    """Mark a single notification as read."""
    updated = await notification_service.mark_read(current_user.id, notification_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )
    return {"success": True, "message": "Notification marked read", "data": None}
