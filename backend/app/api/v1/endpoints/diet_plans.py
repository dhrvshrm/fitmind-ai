from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.nutrition import grocery
from app.schemas.diet_plan import SwapRequest
from app.schemas.fasting import FastingModeCreate
from app.schemas.general import SuccessResponse
from app.services import diet_plan_service, fasting_service, nutrition_service
from app.services.diet_plan_service import DietPlanError
from app.services.fasting_service import FastingModeError

router = APIRouter(prefix="/diet-plans", tags=["Diet plans"])

_STATUS = {
    "not_found": status.HTTP_404_NOT_FOUND,
    "invalid": status.HTTP_400_BAD_REQUEST,
    "unavailable": status.HTTP_503_SERVICE_UNAVAILABLE,
}


def _http(exc: "DietPlanError | FastingModeError") -> HTTPException:
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
    meal_data = meal.public_dict()
    # Plans follow the active fast, but one made before it started may not.
    warning = await fasting_service.meal_warning(
        current_user.id, meal_data.get("items") or [], meal_data.get("name", "")
    )
    return {
        "success": True,
        "message": "Meal logged",
        "data": {
            "meal": meal_data,
            "plan": plan,
            "fasting_warning": warning,
            "xp_earned": xp["xp_earned"],
            "total_xp": xp["total_xp"],
            "new_level": xp["new_level"],
            "leveled_up": xp["leveled_up"],
        },
    }


# ---------------------------------------------------------------------------
# Grocery list
# ---------------------------------------------------------------------------
@router.get("/current/grocery-list", response_model=SuccessResponse)
async def get_grocery_list(
    days: int = Query(grocery.DEFAULT_DAYS, ge=1, le=grocery.MAX_DAYS),
    current_user: User = Depends(get_current_user),
) -> dict:
    """The current plan's dishes over ``days`` days as one shopping list, grouped by aisle.

    Dishes are turned into their main ingredients from a curated list; dishes
    without one are listed under ``ready_made`` with their servings.
    """
    try:
        data = await diet_plan_service.grocery_list(current_user.id, days)
    except DietPlanError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Grocery list", "data": data}


# ---------------------------------------------------------------------------
# Fasting and festival modes
# ---------------------------------------------------------------------------
@router.get("/fasting-modes", response_model=SuccessResponse)
async def list_fasting_modes(current_user: User = Depends(get_current_user)) -> dict:
    """Modes on offer (Navratri, Ekadashi, Jain Paryushan, Ramadan), the user's
    current and upcoming ones, and the one active today."""
    data = await fasting_service.list_modes(current_user.id)
    return {"success": True, "message": "Fasting modes", "data": data}


@router.post("/fasting-modes", response_model=SuccessResponse)
async def create_fasting_mode(
    payload: FastingModeCreate, current_user: User = Depends(get_current_user)
) -> dict:
    """Switch a mode on for dates the user picks. Plans made while it's on follow
    its food rules (and, for Ramadan, sehri and iftar times)."""
    try:
        mode = await fasting_service.create_mode(current_user.id, payload.model_dump())
    except FastingModeError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Fasting mode added", "data": mode}


@router.delete("/fasting-modes/{mode_id}", response_model=SuccessResponse)
async def delete_fasting_mode(mode_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Switch a mode off, or remove an upcoming one."""
    try:
        await fasting_service.delete_mode(current_user.id, mode_id)
    except FastingModeError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Fasting mode removed", "data": None}
