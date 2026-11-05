from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.nutrition import (
    EstimateRequest,
    MealBatchRequest,
    MealLogRequest,
    MealUpdateRequest,
    SavedMealCreate,
    SavedMealLogRequest,
    UserFoodCreate,
    WaterLogRequest,
)
from app.services import nutrition_service
from app.services.nutrition_service import NutritionServiceError, TranscriptionError

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


def _not_found_or_bad(exc: NutritionServiceError) -> HTTPException:
    """Map a service error to 404 (missing) or 400 (invalid request)."""
    code = status.HTTP_404_NOT_FOUND if "not found" in str(exc).lower() else status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=code, detail=str(exc))


async def _logged_response(user_id: str, meal) -> dict:
    """Award meal XP and build the standard "meal logged" response data."""
    xp = await nutrition_service.award_xp_for_meal(user_id)
    return {
        "meal": meal.public_dict(),
        "xp_earned": xp["xp_earned"],
        "total_xp": xp["total_xp"],
        "new_level": xp["new_level"],
        "leveled_up": xp["leveled_up"],
    }


# ---------------------------------------------------------------------------
# Estimation and food search
# ---------------------------------------------------------------------------
@router.post("/estimate", response_model=SuccessResponse)
async def estimate_meal(
    payload: EstimateRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Estimate calories and macros for a meal described in words.

    Foods are matched against the Indian Nutrient Databank and USDA data
    first; unmatched foods get a labelled AI estimate. Nothing is saved.
    """
    estimate = await nutrition_service.estimate_meal(current_user.id, payload.text)
    return {"success": True, "message": "Meal estimated", "data": estimate}


@router.post("/transcribe", response_model=SuccessResponse)
async def transcribe_meal(
    audio: UploadFile = File(...), current_user: User = Depends(get_current_user)
) -> dict:
    """Turn a spoken description of what was eaten into text. Nothing is saved."""
    if audio.content_type and not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload an audio recording")
    data = await audio.read(nutrition_service.MAX_AUDIO_BYTES + 1)
    try:
        text = await nutrition_service.transcribe_meal_audio(
            current_user.id, data, audio.filename or "meal.webm"
        )
    except TranscriptionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "message": "Transcribed", "data": {"text": text}}


@router.get("/foods/search", response_model=SuccessResponse)
async def search_foods(
    q: str = Query(..., min_length=1, max_length=80),
    limit: int = Query(8, ge=1, le=20),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Search the user's own foods and the food datasets by name."""
    foods = await nutrition_service.search_foods(current_user.id, q, limit)
    return {"success": True, "message": "Foods found", "data": {"foods": foods}}


@router.get("/foods/{food_id}", response_model=SuccessResponse)
async def get_food(food_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Return one dataset food with its per-100 g values and default serving."""
    food = nutrition_service.get_food(food_id)
    if food is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")
    return {"success": True, "message": "Food retrieved", "data": food}


# ---------------------------------------------------------------------------
# Meals
# ---------------------------------------------------------------------------
@router.post("/meal", response_model=SuccessResponse)
async def log_meal(
    payload: MealLogRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Log a meal, award meal XP (capped per day), and return it with XP progress."""
    try:
        meal = await nutrition_service.log_meal(
            current_user.id,
            name=payload.name,
            calories=payload.calories,
            protein=payload.protein,
            carbs=payload.carbs,
            fats=payload.fats,
            fiber=payload.fiber,
            meal_type=payload.meal_type,
            eaten_at=payload.eaten_at,
            items=[item.model_dump() for item in payload.items],
            log_date=payload.log_date,
        )
    except NutritionServiceError as exc:
        raise _not_found_or_bad(exc) from exc
    return {
        "success": True,
        "message": "Meal logged",
        "data": await _logged_response(current_user.id, meal),
    }


@router.post("/meals/batch", response_model=SuccessResponse)
async def log_meals(
    payload: MealBatchRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Log several meals at once (a whole day described together).

    All dates are checked before anything is saved, so a bad entry doesn't
    leave the day half-logged. Meal XP is awarded per meal, within the daily cap.
    """
    for meal in payload.meals:
        try:
            nutrition_service.validate_log_date(meal.log_date)
        except NutritionServiceError as exc:
            raise _not_found_or_bad(exc) from exc
    logged, xp_earned, leveled_up, last_xp = [], 0, False, None
    for meal in payload.meals:
        saved = await nutrition_service.log_meal(
            current_user.id,
            name=meal.name,
            calories=meal.calories,
            protein=meal.protein,
            carbs=meal.carbs,
            fats=meal.fats,
            fiber=meal.fiber,
            meal_type=meal.meal_type,
            eaten_at=meal.eaten_at,
            items=[item.model_dump() for item in meal.items],
            log_date=meal.log_date,
        )
        last_xp = await nutrition_service.award_xp_for_meal(current_user.id)
        xp_earned += last_xp["xp_earned"]
        leveled_up = leveled_up or last_xp["leveled_up"]
        logged.append(saved.public_dict())
    return {
        "success": True,
        "message": f"{len(logged)} meals logged",
        "data": {
            "meals": logged,
            "xp_earned": xp_earned,
            "total_xp": last_xp["total_xp"],
            "new_level": last_xp["new_level"],
            "leveled_up": leveled_up,
        },
    }


@router.put("/meal/{meal_id}", response_model=SuccessResponse)
async def update_meal(
    meal_id: str, payload: MealUpdateRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Edit a logged meal's name, foods, totals, type or time."""
    changes = payload.model_dump(exclude_none=True)
    if "items" in changes:
        changes["items"] = [item.model_dump() for item in payload.items or []]
    try:
        meal = await nutrition_service.update_meal(current_user.id, meal_id, changes)
    except NutritionServiceError as exc:
        raise _not_found_or_bad(exc) from exc
    return {"success": True, "message": "Meal updated", "data": {"meal": meal.public_dict()}}


@router.delete("/meal/{meal_id}", response_model=SuccessResponse)
async def delete_meal(meal_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Delete a logged meal."""
    try:
        await nutrition_service.delete_meal(current_user.id, meal_id)
    except NutritionServiceError as exc:
        raise _not_found_or_bad(exc) from exc
    return {"success": True, "message": "Meal deleted", "data": None}


@router.get("/recent", response_model=SuccessResponse)
async def recent_meals(current_user: User = Depends(get_current_user)) -> dict:
    """Distinct meals from the last 30 days, for one-tap re-logging."""
    meals = await nutrition_service.get_recent_meals(current_user.id)
    return {"success": True, "message": "Recent meals retrieved", "data": {"meals": meals}}


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


# ---------------------------------------------------------------------------
# Saved meals and custom foods
# ---------------------------------------------------------------------------
@router.get("/saved-meals", response_model=SuccessResponse)
async def list_saved_meals(current_user: User = Depends(get_current_user)) -> dict:
    meals = await nutrition_service.list_saved_meals(current_user.id)
    return {"success": True, "message": "Saved meals retrieved", "data": {"saved_meals": meals}}


@router.post("/saved-meals", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_meal(
    payload: SavedMealCreate, current_user: User = Depends(get_current_user)
) -> dict:
    """Save foods as a reusable meal (from a logged meal or explicit items)."""
    try:
        saved = await nutrition_service.create_saved_meal(
            current_user.id,
            payload.name,
            [item.model_dump() for item in payload.items],
            payload.meal_type,
            payload.from_meal_id,
        )
    except NutritionServiceError as exc:
        raise _not_found_or_bad(exc) from exc
    return {"success": True, "message": "Meal saved", "data": {"saved_meal": saved}}


@router.post("/saved-meals/{saved_id}/log", response_model=SuccessResponse)
async def log_saved_meal(
    saved_id: str, payload: SavedMealLogRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Log a saved meal for today in one step."""
    try:
        meal = await nutrition_service.log_saved_meal(
            current_user.id, saved_id, payload.meal_type, payload.eaten_at
        )
    except NutritionServiceError as exc:
        raise _not_found_or_bad(exc) from exc
    return {
        "success": True,
        "message": "Meal logged",
        "data": await _logged_response(current_user.id, meal),
    }


@router.delete("/saved-meals/{saved_id}", response_model=SuccessResponse)
async def delete_saved_meal(saved_id: str, current_user: User = Depends(get_current_user)) -> dict:
    try:
        await nutrition_service.delete_saved_meal(current_user.id, saved_id)
    except NutritionServiceError as exc:
        raise _not_found_or_bad(exc) from exc
    return {"success": True, "message": "Saved meal deleted", "data": None}


@router.get("/my-foods", response_model=SuccessResponse)
async def list_user_foods(current_user: User = Depends(get_current_user)) -> dict:
    foods = await nutrition_service.list_user_foods(current_user.id)
    return {"success": True, "message": "Foods retrieved", "data": {"foods": foods}}


@router.post("/my-foods", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_user_food(
    payload: UserFoodCreate, current_user: User = Depends(get_current_user)
) -> dict:
    """Add a custom food or recipe, matched before the public datasets."""
    food = await nutrition_service.create_user_food(current_user.id, payload.model_dump())
    return {"success": True, "message": "Food added", "data": {"food": food}}


@router.delete("/my-foods/{food_id}", response_model=SuccessResponse)
async def delete_user_food(food_id: str, current_user: User = Depends(get_current_user)) -> dict:
    try:
        await nutrition_service.delete_user_food(current_user.id, food_id)
    except NutritionServiceError as exc:
        raise _not_found_or_bad(exc) from exc
    return {"success": True, "message": "Food deleted", "data": None}
