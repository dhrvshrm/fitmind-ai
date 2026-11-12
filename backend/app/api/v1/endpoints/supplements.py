from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.endpoints.auth import get_current_user
from app.api.v1.endpoints.health_profile import crypto_http
from app.health.crypto import HealthCryptoError
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.health import UserSupplementIn, UserSupplementUpdate
from app.services import supplement_service
from app.services.supplement_service import SupplementError

router = APIRouter(prefix="/supplements", tags=["Supplements"])

_STATUS = {"not_found": status.HTTP_404_NOT_FOUND, "invalid": status.HTTP_400_BAD_REQUEST}


def _http(exc: SupplementError) -> HTTPException:
    return HTTPException(status_code=_STATUS.get(exc.kind, status.HTTP_400_BAD_REQUEST), detail=str(exc))


@router.get("/catalog", response_model=SuccessResponse)
async def supplement_catalog(current_user: User = Depends(get_current_user)) -> dict:
    """Curated supplements with evidence, typical amounts, and safety notes for this user."""
    try:
        data = await supplement_service.personalised_catalog(current_user.id)
    except HealthCryptoError as exc:
        raise crypto_http(exc) from exc
    return {"success": True, "message": "Supplement catalogue", "data": data}


@router.get("/catalog/{supplement_id}", response_model=SuccessResponse)
async def supplement_detail(supplement_id: str, current_user: User = Depends(get_current_user)) -> dict:
    try:
        info = await supplement_service.supplement_info(supplement_id, current_user)
    except HealthCryptoError as exc:
        raise crypto_http(exc) from exc
    if info is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplement not found")
    return {"success": True, "message": "Supplement", "data": info}


@router.get("/mine", response_model=SuccessResponse)
async def my_supplements(current_user: User = Depends(get_current_user)) -> dict:
    """The supplements the user tracks, with today's check-off state."""
    items = await supplement_service.list_user_supplements(current_user.id)
    return {"success": True, "message": "Your supplements", "data": items}


@router.post("/mine", response_model=SuccessResponse)
async def add_my_supplement(payload: UserSupplementIn, current_user: User = Depends(get_current_user)) -> dict:
    data = payload.model_dump()
    if payload.macros_per_serving is None:
        data["macros_per_serving"] = None
    try:
        item = await supplement_service.add_supplement(current_user.id, data)
    except SupplementError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Supplement added", "data": item}


@router.patch("/mine/{supplement_id}", response_model=SuccessResponse)
async def update_my_supplement(
    supplement_id: str, payload: UserSupplementUpdate, current_user: User = Depends(get_current_user)
) -> dict:
    try:
        item = await supplement_service.update_supplement(
            current_user.id, supplement_id, payload.model_dump(exclude_unset=True)
        )
    except SupplementError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Supplement updated", "data": item}


@router.delete("/mine/{supplement_id}", response_model=SuccessResponse)
async def remove_my_supplement(supplement_id: str, current_user: User = Depends(get_current_user)) -> dict:
    try:
        await supplement_service.remove_supplement(current_user.id, supplement_id)
    except SupplementError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Supplement removed", "data": None}


@router.post("/mine/{supplement_id}/taken", response_model=SuccessResponse)
async def mark_taken(supplement_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Tick off today. Protein powders also add their macros to today's nutrition."""
    try:
        item = await supplement_service.mark_taken(current_user.id, supplement_id)
    except SupplementError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Marked as taken", "data": item}


@router.delete("/mine/{supplement_id}/taken", response_model=SuccessResponse)
async def mark_not_taken(supplement_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Undo today's tick (and any nutrition it added)."""
    try:
        item = await supplement_service.mark_not_taken(current_user.id, supplement_id)
    except SupplementError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Marked as not taken", "data": item}


@router.get("/history", response_model=SuccessResponse)
async def supplement_history(
    days: int = Query(14, ge=1, le=60), current_user: User = Depends(get_current_user)
) -> dict:
    """Supplements taken per day for the last ``days`` days."""
    data = await supplement_service.history(current_user.id, days)
    return {"success": True, "message": "Supplement history", "data": data}
