from fastapi import APIRouter, Depends

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.services import habit_service

router = APIRouter(prefix="/today", tags=["Today"])


@router.get("/status", response_model=SuccessResponse)
async def today_status(current_user: User = Depends(get_current_user)) -> dict:
    """What the Today screen needs beyond meals, workout and water: the fresh-start
    card after missed days, whether recovery is checked in, and reminder availability."""
    data = await habit_service.today_status(current_user)
    return {"success": True, "message": "Today", "data": data}
