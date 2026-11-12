from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.endpoints.auth import get_current_user
from app.health.crypto import HealthCryptoError
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.health import ConsentRequest, HealthProfileIn
from app.services import consent_service, health_profile_service
from app.services.consent_service import ConsentRequired
from app.services.health_profile_service import HealthProfileError

router = APIRouter(tags=["Health profile"])


def consent_http(exc: ConsentRequired) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


def crypto_http(_exc: HealthCryptoError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                         detail="Health data is unavailable right now. Please try again later")


@router.get("/consents", response_model=SuccessResponse)
async def get_consents(current_user: User = Depends(get_current_user)) -> dict:
    """Which kinds of health data the user has agreed to let the app store."""
    return {"success": True, "message": "Consents", "data": await consent_service.status(current_user.id)}


@router.post("/consents", response_model=SuccessResponse)
async def grant_consent(payload: ConsentRequest, current_user: User = Depends(get_current_user)) -> dict:
    """Agree to the current version of a consent (``health_profile`` or ``health_reports``)."""
    await consent_service.grant(current_user.id, payload.scope)
    return {"success": True, "message": "Thanks. You can change this any time",
            "data": await consent_service.status(current_user.id)}


@router.delete("/consents/{scope}", response_model=SuccessResponse)
async def withdraw_consent(scope: str, current_user: User = Depends(get_current_user)) -> dict:
    """Withdraw a consent. The health data it covers is deleted straight away."""
    if scope not in consent_service.SCOPES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown consent")
    result = await consent_service.withdraw(current_user.id, scope)
    return {"success": True, "message": "Consent withdrawn and the data deleted",
            "data": {"deleted": result["deleted"], "consents": await consent_service.status(current_user.id)}}


@router.get("/health-profile", response_model=SuccessResponse)
async def get_health_profile(current_user: User = Depends(get_current_user)) -> dict:
    """The health profile (``profile`` is null without consent or answers) and how it shapes plans."""
    try:
        data = await health_profile_service.profile_view(current_user.id)
    except HealthCryptoError as exc:
        raise crypto_http(exc) from exc
    return {"success": True, "message": "Health profile", "data": data}


@router.put("/health-profile", response_model=SuccessResponse)
async def save_health_profile(payload: HealthProfileIn, current_user: User = Depends(get_current_user)) -> dict:
    """Save the health questionnaire. Needs ``health_profile`` consent."""
    try:
        await health_profile_service.save_profile(current_user.id, payload.model_dump())
    except ConsentRequired as exc:
        raise consent_http(exc) from exc
    except HealthProfileError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except HealthCryptoError as exc:
        raise crypto_http(exc) from exc
    return {"success": True, "message": "Health profile saved",
            "data": await health_profile_service.profile_view(current_user.id)}
