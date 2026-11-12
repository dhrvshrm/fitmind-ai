from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.activity import ActivitySettingsUpdate, StepsLogRequest
from app.schemas.general import SuccessResponse
from app.services import activity_service
from app.services.activity_service import ActivityServiceError

router = APIRouter(prefix="/activity", tags=["Activity"])


def _bad_request(exc: ActivityServiceError) -> HTTPException:
    code = status.HTTP_404_NOT_FOUND if "not found" in str(exc).lower() or "no steps" in str(exc).lower() \
        else status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=code, detail=str(exc))


@router.get("/steps", response_model=SuccessResponse)
async def get_steps(
    days: int = Query(activity_service.DEFAULT_HISTORY_DAYS, ge=1, le=activity_service.MAX_HISTORY_DAYS),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Daily steps for the last ``days`` days, the step target, and the activity estimate."""
    summary = await activity_service.steps_summary(current_user, days)
    return {"success": True, "message": "Steps retrieved", "data": summary}


@router.put("/steps/{day}", response_model=SuccessResponse)
async def put_steps(
    day: date, payload: StepsLogRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Set the steps for one local date (today or up to 30 days back)."""
    try:
        entry = await activity_service.log_steps(current_user, day, payload.steps)
    except ActivityServiceError as exc:
        raise _bad_request(exc) from exc
    summary = await activity_service.steps_summary(current_user)
    return {"success": True, "message": "Steps saved", "data": {"entry": entry, "summary": summary}}


@router.delete("/steps/{day}", response_model=SuccessResponse)
async def delete_steps(day: date, current_user: User = Depends(get_current_user)) -> dict:
    """Remove one day's steps."""
    try:
        await activity_service.delete_steps(current_user, day)
    except ActivityServiceError as exc:
        raise _bad_request(exc) from exc
    summary = await activity_service.steps_summary(current_user)
    return {"success": True, "message": "Steps removed", "data": {"summary": summary}}


@router.get("/settings", response_model=SuccessResponse)
async def get_settings(current_user: User = Depends(get_current_user)) -> dict:
    """Step target and work-hours break reminder settings."""
    settings = await activity_service.get_settings(current_user)
    return {"success": True, "message": "Activity settings", "data": settings}


@router.put("/settings", response_model=SuccessResponse)
async def update_settings(
    payload: ActivitySettingsUpdate, current_user: User = Depends(get_current_user)
) -> dict:
    """Change the step target or break reminder settings (partial update)."""
    try:
        settings = await activity_service.update_settings(current_user, payload.model_dump())
    except ActivityServiceError as exc:
        raise _bad_request(exc) from exc
    return {"success": True, "message": "Activity settings saved", "data": settings}


@router.get("/desk-routines", response_model=SuccessResponse)
async def list_desk_routines(current_user: User = Depends(get_current_user)) -> dict:
    """Short desk mobility and posture routines (moves that load an injured joint are left out)."""
    routines = activity_service.list_routines(current_user)
    return {"success": True, "message": "Desk routines", "data": {"routines": routines}}


@router.get("/desk-routines/{routine_id}", response_model=SuccessResponse)
async def get_desk_routine(routine_id: str, current_user: User = Depends(get_current_user)) -> dict:
    try:
        routine = activity_service.get_routine(current_user, routine_id)
    except ActivityServiceError as exc:
        raise _bad_request(exc) from exc
    return {"success": True, "message": "Desk routine", "data": routine}
