from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.diet_plan import SwapRequest
from app.schemas.general import SuccessResponse
from app.services import diet_plan_service, nutrition_service
from app.services.diet_plan_service import DietPlanError

router = APIRouter(prefix="/diet-plans", tags=["Diet plans"])

_STATUS = {
    "not_found": status.HTTP_404_NOT_FOUND,
    "invalid": status.HTTP_400_BAD_REQUEST,
    "unavailable": status.HTTP_503_SERVICE_UNAVAILABLE,
}


def _http(exc: DietPlanError) -> HTTPException:
    return HTTPException(status_code=_STATUS.get(exc.kind, status.HTTP_400_BAD_REQUEST), detail=str(exc))


@router.get("/current", response_model=SuccessResponse)
async def get_current_plan(current_user: User = Depends(get_current_user)) -> dict:
    """The user's current meal plan (``data`` is null when there isn't one)."""
    plan = await diet_plan_service.get_plan(current_user.id)
    return {"success": True, "message": "Meal plan", "data": plan}


@router.post("", response_model=SuccessResponse)
async def create_plan(current_user: User = Depends(get_current_user)) -> dict:
    """Create a meal plan from the user's targets and food answers, replacing any current one.

    The AI only chooses dishes from foods the user's diet and allergies allow;
    every number comes from the food database and portions are fitted to the targets.
    """
    try:
        plan = await diet_plan_service.create_plan(current_user.id)
    except DietPlanError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Meal plan created", "data": plan}


@router.post("/current/meals/{meal_id}/regenerate", response_model=SuccessResponse)
async def regenerate_meal(meal_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Replace one meal with a different option, keeping the rest of the day."""
    try:
        plan = await diet_plan_service.regenerate_meal(current_user.id, meal_id)
    except DietPlanError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Meal updated", "data": plan}


@router.get("/current/meals/{meal_id}/items/{index}/alternatives", response_model=SuccessResponse)
async def swap_options(
    meal_id: str,
    index: int,
    q: Optional[str] = Query(None, max_length=80),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Foods that could replace one planned food, sized to about the same calories."""
    try:
        options = await diet_plan_service.swap_options(current_user.id, meal_id, index, q)
    except DietPlanError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Alternatives", "data": options}


@router.post("/current/meals/{meal_id}/items/{index}/swap", response_model=SuccessResponse)
async def swap_item(
    meal_id: str, index: int, payload: SwapRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Replace one planned food with an allowed alternative."""
    try:
        plan = await diet_plan_service.swap_item(current_user.id, meal_id, index, payload.food_id)
    except DietPlanError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Food swapped", "data": plan}


@router.post("/current/meals/{meal_id}/log", response_model=SuccessResponse)
async def log_plan_meal(meal_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Log a planned meal as eaten today (awards meal XP like any logged meal)."""
    try:
        meal, plan = await diet_plan_service.log_plan_meal(current_user.id, meal_id)
    except DietPlanError as exc:
        raise _http(exc) from exc
    xp = await nutrition_service.award_xp_for_meal(current_user.id)
    return {
        "success": True,
        "message": "Meal logged",
        "data": {
            "meal": meal.public_dict(),
            "plan": plan,
            "xp_earned": xp["xp_earned"],
            "total_xp": xp["total_xp"],
            "new_level": xp["new_level"],
            "leveled_up": xp["leveled_up"],
        },
    }
