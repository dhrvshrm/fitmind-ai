from fastapi import APIRouter
from app.schemas.user import UserOnboarding
from app.schemas.general import SuccessResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/onboarding", response_model=SuccessResponse)
async def onboard_user(data: UserOnboarding):
    """Complete user onboarding"""
    bmi = data.weight_kg / ((data.height_cm / 100) ** 2)
    return {
        "success": True,
        "message": "Onboarding completed",
        "data": {"bmi": round(bmi, 2), "tdee": 2500}
    }

@router.get("/profile", response_model=SuccessResponse)
async def get_profile():
    """Get user profile"""
    return {
        "success": True,
        "message": "Profile retrieved",
        "data": {"id": "user_id", "xp": 0, "level": 1}
    }
