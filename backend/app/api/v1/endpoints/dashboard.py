from fastapi import APIRouter, Depends

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=SuccessResponse)
async def get_summary(current_user: User = Depends(get_current_user)) -> dict:
    """Return today's dashboard summary for the authenticated user."""
    data = await dashboard_service.get_dashboard_summary(current_user)
    return {
        "success": True,
        "message": "Dashboard summary retrieved",
        "data": data,
    }
