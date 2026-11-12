from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.progress import (
    AcceptTargetRequest,
    ChallengeCreateRequest,
    FlexibleDayRequest,
    MeasurementRequest,
    WeightLogRequest,
)
from app.services import challenge_service, insight_service, photo_service, progress_service
from app.services.progress_service import ProgressServiceError
from app.utils.time import local_today

router = APIRouter(prefix="/progress", tags=["Progress"])
challenges_router = APIRouter(prefix="/challenges", tags=["Challenges"])


def _ok(message: str, data: object = None) -> dict:
    return {"success": True, "message": message, "data": data}


def _fail(exc: ProgressServiceError) -> HTTPException:
    return HTTPException(status_code=exc.status, detail=str(exc))


# ---------------------------------------------------------------------------
# Weight and measurements
# ---------------------------------------------------------------------------
@router.get("/weight", response_model=SuccessResponse)
async def weight_trend(
    days: int = Query(90, ge=14, le=365), current_user: User = Depends(get_current_user)
) -> dict:
    """Weigh-ins with a smoothed trend, weekly rate of change and direction."""
    return _ok("Weight trend", await progress_service.get_weight_trend(current_user.id, days))


@router.post("/weight", response_model=SuccessResponse)
async def log_weight(payload: WeightLogRequest, current_user: User = Depends(get_current_user)) -> dict:
    """Record a weigh-in for today or up to a week back (one per day)."""
    try:
        data = await progress_service.log_weight(current_user.id, payload.weight_kg, payload.date)
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Weight saved", data)


@router.get("/measurements", response_model=SuccessResponse)
async def measurements(
    days: int = Query(90, ge=14, le=365), current_user: User = Depends(get_current_user)
) -> dict:
    """Waist and hip readings, each with its own trend."""
    return _ok("Measurements", await progress_service.get_measurements(current_user.id, days))


@router.post("/measurements", response_model=SuccessResponse)
async def log_measurement(payload: MeasurementRequest, current_user: User = Depends(get_current_user)) -> dict:
    """Record waist and/or hip for today or up to a week back."""
    try:
        data = await progress_service.log_measurement(
            current_user.id, payload.waist_cm, payload.hip_cm, payload.date
        )
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Measurement saved", data)


# ---------------------------------------------------------------------------
# Adaptive target
# ---------------------------------------------------------------------------
@router.get("/adaptive-target", response_model=SuccessResponse)
async def adaptive_target(current_user: User = Depends(get_current_user)) -> dict:
    """Whether logs suggest a different calorie target (never applied automatically)."""
    return _ok("Adaptive target", await progress_service.get_adaptive_status(current_user))


@router.post("/adaptive-target/accept", response_model=SuccessResponse)
async def accept_adaptive_target(
    payload: AcceptTargetRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Apply the suggested calorie target the user was shown."""
    try:
        targets = await progress_service.accept_adaptive_target(current_user, payload.calories)
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Your calorie target is updated", targets)


@router.post("/adaptive-target/dismiss", response_model=SuccessResponse)
async def dismiss_adaptive_target(current_user: User = Depends(get_current_user)) -> dict:
    """Keep the current target; the next suggestion waits at least a week."""
    try:
        data = await progress_service.dismiss_adaptive_target(current_user)
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Kept your current target", data)


# ---------------------------------------------------------------------------
# Patterns, insights, week summary
# ---------------------------------------------------------------------------
@router.get("/patterns", response_model=SuccessResponse)
async def patterns(current_user: User = Depends(get_current_user)) -> dict:
    """Habits seen in the last four weeks, each with its evidence."""
    return _ok("Patterns", await progress_service.get_patterns(current_user))


@router.get("/weekly-insight", response_model=SuccessResponse)
async def weekly_insight(current_user: User = Depends(get_current_user)) -> dict:
    """A short note on last week: what went well and one thing to change."""
    return _ok("Weekly insight", await insight_service.get_weekly_insight(current_user))


@router.get("/week-summary", response_model=SuccessResponse)
async def week_summary(current_user: User = Depends(get_current_user)) -> dict:
    """Numbers for the last seven days, used by the shareable summary card."""
    return _ok("Week summary", await progress_service.get_week_summary(current_user))


# ---------------------------------------------------------------------------
# Flexible days and effective targets
# ---------------------------------------------------------------------------
@router.get("/flexible-days", response_model=SuccessResponse)
async def flexible_week(
    week_of: Optional[date] = Query(None), current_user: User = Depends(get_current_user)
) -> dict:
    """Daily targets for a week (this week by default) and its flexible days."""
    return _ok("Flexible days", await progress_service.get_flexible_week(current_user, week_of))


@router.post("/flexible-days", response_model=SuccessResponse)
async def mark_flexible_day(payload: FlexibleDayRequest, current_user: User = Depends(get_current_user)) -> dict:
    """Mark a day as flexible; the rest of that week is rebalanced gently."""
    try:
        data = await progress_service.mark_flexible_day(
            current_user, payload.date, payload.reason, payload.extra_kcal, payload.note
        )
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Flexible day saved", data)


@router.delete("/flexible-days/{day}", response_model=SuccessResponse)
async def unmark_flexible_day(day: date, current_user: User = Depends(get_current_user)) -> dict:
    """Turn a flexible day back into a normal one."""
    try:
        await progress_service.unmark_flexible_day(current_user, day)
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Flexible day removed")


@router.get("/effective-target", response_model=SuccessResponse)
async def effective_target(
    day: Optional[date] = Query(None, alias="date"), current_user: User = Depends(get_current_user)
) -> dict:
    """Targets for a date (today by default) after flexible days and rebalancing."""
    data = await progress_service.effective_target_for(current_user, day or local_today())
    return _ok("Effective target", data)


# ---------------------------------------------------------------------------
# Progress photos
# ---------------------------------------------------------------------------
@router.get("/photos", response_model=SuccessResponse)
async def list_photos(current_user: User = Depends(get_current_user)) -> dict:
    """Private progress photos with short-lived signed URLs (or unavailable)."""
    return _ok("Progress photos", await photo_service.list_photos(current_user.id))


@router.post("/photos", response_model=SuccessResponse)
async def upload_photo(
    photo: UploadFile = File(...),
    photo_date: Optional[date] = Form(None, alias="date"),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Upload a private progress photo (JPEG, PNG or WebP, up to 5 MB)."""
    data = await photo.read(photo_service.MAX_PHOTO_BYTES + 1)
    try:
        saved = await photo_service.upload_photo(current_user.id, data, photo_date)
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Photo saved", saved)


@router.delete("/photos/{photo_id}", response_model=SuccessResponse)
async def delete_photo(photo_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Delete a progress photo and its stored image."""
    try:
        await photo_service.delete_photo(current_user.id, photo_id)
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Photo deleted")


# ---------------------------------------------------------------------------
# Friend challenges
# ---------------------------------------------------------------------------
@challenges_router.get("", response_model=SuccessResponse)
async def list_challenges(current_user: User = Depends(get_current_user)) -> dict:
    """The user's challenges with live progress, and the kinds they can start."""
    return _ok("Challenges", await challenge_service.list_challenges(current_user.id))


@challenges_router.post("", response_model=SuccessResponse)
async def create_challenge(
    payload: ChallengeCreateRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Invite a friend to a challenge."""
    try:
        data = await challenge_service.create_challenge(current_user.id, payload.friend_id, payload.kind)
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Challenge sent", data)


@challenges_router.post("/{challenge_id}/accept", response_model=SuccessResponse)
async def accept_challenge(challenge_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Accept a challenge invite; it starts today."""
    try:
        data = await challenge_service.accept_challenge(current_user.id, challenge_id)
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Challenge accepted", data)


@challenges_router.post("/{challenge_id}/decline", response_model=SuccessResponse)
async def decline_challenge(challenge_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Decline an invite, or cancel one you sent."""
    try:
        await challenge_service.decline_challenge(current_user.id, challenge_id)
    except ProgressServiceError as exc:
        raise _fail(exc) from exc
    return _ok("Challenge declined")
