from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.services import voice_service

router = APIRouter(prefix="/checkin", tags=["Voice Check-in"])


@router.post("/voice", response_model=SuccessResponse)
async def record_voice_checkin(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Record and analyse a voice check-in.

    Accepts a multipart audio file, transcribes it, detects mood/energy and
    stores the check-in.
    """
    audio_bytes = await audio.read()
    checkin = await voice_service.process_voice(
        audio_bytes,
        current_user.id,
        filename=audio.filename or "audio.webm",
        content_type=audio.content_type or "audio/webm",
    )
    return {
        "success": True,
        "message": "Voice check-in processed",
        "data": {
            "transcript": checkin.transcript,
            "mood": checkin.mood,
            "energy_level": checkin.energy_level,
            "timestamp": checkin.created_at.isoformat(),
        },
    }


@router.get("/history", response_model=SuccessResponse)
async def get_voice_history(
    limit: int = Query(30, ge=1, le=90),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the user's voice check-in history (newest first)."""
    checkins = await voice_service.get_voice_history(current_user.id, limit=limit)
    return {
        "success": True,
        "message": "Voice check-in history retrieved",
        "data": {
            "checkins": [
                {"date": c.log_date, "mood": c.mood, "energy": c.energy_level}
                for c in checkins
            ],
        },
    }
