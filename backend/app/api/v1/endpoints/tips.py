from fastapi import APIRouter, Depends

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.services import tip_service

router = APIRouter(prefix="/tips", tags=["Tips"])


@router.get("/today", response_model=SuccessResponse)
async def tip_of_the_day(current_user: User = Depends(get_current_user)) -> dict:
    """One short tip or "did you know" fact, the same for everyone each day."""
    tip = await tip_service.tip_of_the_day()
    return {"success": True, "message": "Tip of the day", "data": tip}
