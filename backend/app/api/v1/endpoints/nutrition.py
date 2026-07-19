from fastapi import APIRouter, Depends, Query

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.nutrition import MealLogRequest, WaterLogRequest
from app.services import nutrition_service

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


@router.post("/meal", response_model=SuccessResponse)
async def log_meal(
    payload: MealLogRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Log a meal, award +10 XP, and return the meal with XP progress."""
    meal = await nutrition_service.log_meal(
        current_user.id,
        name=payload.name,
        calories=payload.calories,
        protein=payload.protein,
        carbs=payload.carbs,
        fats=payload.fats,
    )
    xp = await nutrition_service.award_xp_for_meal(current_user.id)
    return {
        "success": True,
        "message": "Meal logged",
        "data": {
            "meal": {
                "id": meal.id,
                "name": meal.name,
                "calories": meal.calories,
                "protein": meal.protein,
                "carbs": meal.carbs,
                "fats": meal.fats,
                "date": meal.log_date,
            },
            "xp_earned": xp["xp_earned"],
            "total_xp": xp["total_xp"],
            "new_level": xp["new_level"],
            "leveled_up": xp["leveled_up"],
        },
    }


@router.get("/today", response_model=SuccessResponse)
async def get_today_nutrition(current_user: User = Depends(get_current_user)) -> dict:
    """Return today's nutrition summary (totals, goals, macros, water)."""
    summary = await nutrition_service.get_nutrition_summary(current_user.id)
    return {
        "success": True,
        "message": "Today's nutrition retrieved",
        "data": summary,
    }


@router.get("/history", response_model=SuccessResponse)
async def get_nutrition_history(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return per-day nutrition totals (newest first)."""
    history = await nutrition_service.get_nutrition_history(current_user.id, days=days)
    return {
        "success": True,
        "message": "Nutrition history retrieved",
        "data": {"history": history},
    }


@router.post("/water", response_model=SuccessResponse)
async def log_water(
    payload: WaterLogRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Log water intake and return today's running total (ml)."""
    total_ml = await nutrition_service.log_water(current_user.id, payload.amount_ml)
    return {
        "success": True,
        "message": "Water logged",
        "data": {"water_ml": total_ml},
    }
