from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.habit import ClientEvent
from app.services import analytics_service
from app.services.analytics_service import AnalyticsError

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post("/events", response_model=SuccessResponse, status_code=status.HTTP_202_ACCEPTED)
async def record_event(payload: ClientEvent, current_user: User = Depends(get_current_user)) -> dict:
    """Record an app event (``app_opened``, ``today_viewed``, ``app_installed``,
    ``reminder_opened``, ``restart_action``). Other names are refused; properties
    outside the allowlist are dropped."""
    try:
        await analytics_service.track_client_event(current_user.id, payload.event, payload.properties)
    except AnalyticsError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "message": "Event recorded", "data": None}
