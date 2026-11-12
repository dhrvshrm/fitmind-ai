import hmac
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.api.v1.endpoints.auth import get_current_user
from app.config.settings import get_settings
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.habit import PushSubscriptionIn, PushUnsubscribe, ReminderSettingsUpdate
from app.services import push_service, reminder_service
from app.services.push_service import PushError
from app.services.reminder_service import ReminderError

router = APIRouter(prefix="/reminders", tags=["Reminders"])


async def _state(user_id: str) -> dict:
    return {
        "settings": await reminder_service.get_settings(user_id),
        "push_available": push_service.is_enabled(),
        "public_key": push_service.public_key(),
        "subscribed": await push_service.has_subscription(user_id),
    }


@router.get("", response_model=SuccessResponse)
async def get_reminders(current_user: User = Depends(get_current_user)) -> dict:
    """Reminder settings, whether push is available, and the VAPID public key to subscribe with."""
    return {"success": True, "message": "Reminders", "data": await _state(current_user.id)}


@router.put("", response_model=SuccessResponse)
async def update_reminders(
    payload: ReminderSettingsUpdate, current_user: User = Depends(get_current_user)
) -> dict:
    """Turn reminder types on or off and set the workout and water reminder times."""
    try:
        await reminder_service.update_settings(current_user.id, payload.model_dump(exclude_unset=True))
    except ReminderError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "message": "Reminders updated", "data": await _state(current_user.id)}


@router.post("/subscribe", response_model=SuccessResponse)
async def subscribe(
    payload: PushSubscriptionIn, request: Request, current_user: User = Depends(get_current_user)
) -> dict:
    """Save this browser's push subscription so reminders can reach it."""
    try:
        await push_service.subscribe(
            current_user.id, payload.model_dump(), request.headers.get("user-agent")
        )
    except PushError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "message": "Reminders are on for this device", "data": await _state(current_user.id)}


@router.post("/unsubscribe", response_model=SuccessResponse)
async def unsubscribe(payload: PushUnsubscribe, current_user: User = Depends(get_current_user)) -> dict:
    """Stop sending reminders to this browser."""
    await push_service.unsubscribe(current_user.id, payload.endpoint)
    return {"success": True, "message": "Reminders are off for this device", "data": await _state(current_user.id)}


@router.post("/test", response_model=SuccessResponse)
async def send_test(current_user: User = Depends(get_current_user)) -> dict:
    """Send a test notification to the user's devices."""
    delivered = await push_service.send_push(
        current_user.id, "Reminders are on", "This is how your reminders will look.", "/today", "test"
    )
    return {"success": True, "message": "Test sent", "data": {"delivered": delivered}}


@router.post("/run", response_model=SuccessResponse)
async def run_reminders(x_cron_secret: Optional[str] = Header(default=None)) -> dict:
    """Send due reminders. For an external cron (every 15 minutes) while the server sleeps.

    Needs the ``X-Cron-Secret`` header to match ``CRON_SECRET``; when no secret is
    configured this endpoint is switched off.
    """
    secret = get_settings().CRON_SECRET
    if not secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if not x_cron_secret or not hmac.compare_digest(x_cron_secret, secret):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    result = await reminder_service.run_due_reminders()
    return {"success": True, "message": "Reminders checked", "data": result}
