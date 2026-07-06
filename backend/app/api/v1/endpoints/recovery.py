from fastapi import APIRouter
from app.schemas.general import SuccessResponse

router = APIRouter(prefix="/recovery", tags=["Recovery"])

@router.post("/log", response_model=SuccessResponse)
async def log_recovery(recovery_data: dict):
    """Log recovery metrics"""
    return {
        "success": True,
        "message": "Recovery logged",
        "data": {"recovery_score": 75}
    }

@router.get("/score/today", response_model=SuccessResponse)
async def get_today_recovery_score():
    """Get today's recovery score"""
    return {
        "success": True,
        "message": "Recovery score retrieved",
        "data": {"score": 75}
    }
