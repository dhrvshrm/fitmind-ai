import logging
import re
from datetime import date as date_cls
from datetime import timedelta
from typing import Any, Dict, List, Optional

from app.models import audit
from app.models.food_library import SavedMeal, UserFood
from app.models.nutrition import Meal, add_water, get_water
from app.models.user import User
from app.ai import client as ai_client
from app.ai.client import AIError, AIQuotaError
from app.nutrition import estimator, food_db
from app.nutrition.food_db import Food, Nutrients, Serving
from app.nutrition.text import normalize
from app.services import gamification_service, user_service
from app.utils.time import local_today, local_today_iso

logger = logging.getLogger(__name__)

# Fallback goals for users who haven't given age, sex, height and weight yet;
# everyone else gets personalised targets (app/nutrition/targets.py).
MACRO_SPLIT = {"protein": 0.30, "carbs": 0.40, "fats": 0.30}
DEFAULT_TDEE = 2000
# Suggested fiber: 14 g per 1,000 kcal (a common dietary-guideline ratio).
FIBER_PER_1000_KCAL = 14

# Calories per gram of each macronutrient.
CALS_PER_GRAM = {"protein": 4, "carbs": 4, "fats": 9}

# How far back a meal can be logged for (e.g. "yesterday's dinner").
MAX_BACKFILL_DAYS = 7
RECENT_MEAL_DAYS = 30
RECENT_MEAL_LIMIT = 8


class NutritionServiceError(Exception):
    """Raised when a nutrition-service operation fails (e.g. meal not found)."""


def calculate_macro_percentages(
    protein: float, carbs: float, fats: float
) -> Dict[str, float]:
    """Return each macro's share of total macro calories, as percentages.

    Returns zeros when no macros are present.
    """
    p_cal = protein * CALS_PER_GRAM["protein"]
    c_cal = carbs * CALS_PER_GRAM["carbs"]
    f_cal = fats * CALS_PER_GRAM["fats"]
    total = p_cal + c_cal + f_cal
    if total <= 0:
        return {"protein": 0.0, "carbs": 0.0, "fats": 0.0}
    return {
        "protein": round(p_cal / total * 100, 1),
        "carbs": round(c_cal / total * 100, 1),
        "fats": round(f_cal / total * 100, 1),
    }


def _macro_goals(tdee: int) -> Dict[str, float]:
    """Compute daily macro goals (grams) from a TDEE calorie target."""
    return {
        "calories": float(tdee),
        "protein": round(MACRO_SPLIT["protein"] * tdee / CALS_PER_GRAM["protein"], 1),
        "carbs": round(MACRO_SPLIT["carbs"] * tdee / CALS_PER_GRAM["carbs"], 1),
        "fats": round(MACRO_SPLIT["fats"] * tdee / CALS_PER_GRAM["fats"], 1),
        "fiber": round(tdee / 1000 * FIBER_PER_1000_KCAL, 1),
    }


def _goals_from_targets(targets: Dict[str, Any]) -> Dict[str, float]:
    """The summary's goal shape from personalised targets."""
    return {
        "calories": float(targets["calories"]),
        "protein": float(targets["protein"]),
        "carbs": float(targets["carbs"]),
        "fats": float(targets["fats"]),
        "fiber": float(targets["fiber"]),
    }


def _meal_source(items: List[Dict[str, Any]]) -> str:
    """Summarise where a meal's numbers came from, from its items."""
    if not items:
        return "manual"
    verified = [bool(i.get("verified")) and not i.get("edited") for i in items]
    if all(verified):
        return "verified"
    if any(i.get("source") == "ai_estimate" for i in items) and not any(verified):
        return "estimated"
    return "mixed"


def validate_log_date(log_date: Optional[date_cls]) -> str:
    """Public check used before batch logging; see :func:`_resolve_log_date`."""
    return _resolve_log_date(log_date)


def _resolve_log_date(log_date: Optional[date_cls]) -> str:
    """Validate a backfill date: today or up to a week back in the user's timezone."""
    today = local_today()
    if log_date is None:
        return today.isoformat()
    if log_date > today or log_date < today - timedelta(days=MAX_BACKFILL_DAYS):
        raise NutritionServiceError(
            f"Meals can be logged for today or up to {MAX_BACKFILL_DAYS} days back"
        )
    return log_date.isoformat()


# ---------------------------------------------------------------------------
# Voice input
# ---------------------------------------------------------------------------
# Largest recording accepted for meal dictation (about 5 minutes of compressed speech).
MAX_AUDIO_BYTES = 5 * 1024 * 1024
# Example vocabulary so Whisper spells Indian dishes the way people type them.
TRANSCRIBE_HINT = (
    "Breakfast: poha, upma, 2 aloo paratha with dahi, chai. Lunch: dal, chawal, 2 roti, "
    "rajma, chole, paneer sabzi, curd. Snack: samosa, vada pav, sprouts. Dinner: khichdi, "
    "idli, dosa, sambar, chicken curry, biryani."
)


class TranscriptionError(Exception):
    """Raised when a recording can't be turned into text."""


async def transcribe_meal_audio(user_id: str, audio: bytes, filename: str) -> str:
    """Turn a spoken meal description into text for the user to review.

    Raises:
        TranscriptionError: if the audio is empty or too large, or transcription fails.
    """
    if not audio:
        raise TranscriptionError("The recording was empty")
    if len(audio) > MAX_AUDIO_BYTES:
        raise TranscriptionError("The recording is too long. Keep it under about 5 minutes.")
    try:
        # English output keeps Hinglish in Latin script ("do roti aur dal"), which the parser reads best.
        text = await ai_client.transcribe(
            audio, filename, user_id=user_id, language="en", prompt=TRANSCRIBE_HINT
        )
    except AIQuotaError as e:
        raise TranscriptionError("Today's AI limit is used up. Type the meal instead.") from e
    except AIError as e:
        raise TranscriptionError("Couldn't transcribe the recording. Please try again or type it.") from e
    if not text:
        raise TranscriptionError("No speech was detected. Please try again.")
    return text


# ---------------------------------------------------------------------------
# Estimation and food search
# ---------------------------------------------------------------------------
def _user_food_to_food(doc: Dict[str, Any]) -> Food:
    """Express a user's food (per serving) as a dataset-style food (per 100 g)."""
    grams = doc["serving_grams"] or 100
    per_serving = Nutrients(**doc["per_serving"])
    return Food(
        id=doc["id"],
        name=doc["name"],
        aliases=doc.get("aliases", []),
        source="custom",
        per_100g=per_serving.scaled(100 / grams),
        serving=Serving(unit=doc["serving_unit"], grams=grams, from_source=True),
    )


async def _user_foods(user_id: str) -> List[Food]:
    return [_user_food_to_food(d) for d in await UserFood.list(user_id)]


async def estimate_meal(user_id: str, text: str) -> Dict[str, Any]:
    """Estimate the nutrition of a free-text meal description."""
    result = await estimator.estimate_meal(text, user_id, await _user_foods(user_id))
    return result.model_dump()


async def search_foods(user_id: str, query: str, limit: int = 8) -> List[Dict[str, Any]]:
    """Search the user's own foods and the food datasets by name."""
    results = []
    for food in await _user_foods(user_id):
        score = max(food_db.name_score(query, n) for n in [food.name, *food.aliases])
        if score >= food_db.SUGGESTION_THRESHOLD:
            results.append((score + 0.05, food))  # Prefer the user's own entries.
    results += [(m.score, m.food) for m in food_db.search(query, limit)]
    results.sort(key=lambda r: r[0], reverse=True)
    return [
        {"score": round(min(score, 1.0), 3), **food.model_dump()}
        for score, food in results[:limit]
    ]


def get_food(food_id: str) -> Optional[Dict[str, Any]]:
    food = food_db.get_food(food_id)
    return food.model_dump() if food else None


# ---------------------------------------------------------------------------
# Meals
# ---------------------------------------------------------------------------
async def log_meal(
    user_id: str,
    name: str,
    calories: float,
    protein: float = 0,
    carbs: float = 0,
    fats: float = 0,
    fiber: float = 0,
    meal_type: Optional[str] = None,
    eaten_at: Optional[str] = None,
    items: Optional[List[Dict[str, Any]]] = None,
    log_date: Optional[date_cls] = None,
) -> Meal:
    """Persist a logged meal for the user and return it.

    Raises:
        NutritionServiceError: if ``log_date`` is outside the backfill window.
    """
    items = items or []
    meal = Meal(
        user_id,
        name,
        calories,
        protein,
        carbs,
        fats,
        fiber=fiber,
        meal_type=meal_type,
        eaten_at=eaten_at,
        items=items,
        source=_meal_source(items),
        log_date=_resolve_log_date(log_date),
    )
    await meal.save()
    return meal


async def update_meal(user_id: str, meal_id: str, changes: Dict[str, Any]) -> Meal:
    """Edit a logged meal. Any change marks it as user-edited and is audited.

    Raises:
        NutritionServiceError: if the meal doesn't exist or isn't the user's.
    """
    meal = await Meal.get_for_user(user_id, meal_id)
    if meal is None:
        raise NutritionServiceError("Meal not found")
    updates = {k: v for k, v in changes.items() if v is not None}
    if not updates:
        return meal
    before = meal.to_dict()
    if "items" in updates:
        updates["source"] = _meal_source(updates["items"])
    updates["edited"] = True
    await meal.update(updates)
    await audit.record_change(
        user_id, "meal", "update", before, meal.to_dict(), entity_id=meal_id
    )
    return meal


async def delete_meal(user_id: str, meal_id: str) -> None:
    """Delete a logged meal (audited).

    Raises:
        NutritionServiceError: if the meal doesn't exist or isn't the user's.
    """
    meal = await Meal.get_for_user(user_id, meal_id)
    if meal is None:
        raise NutritionServiceError("Meal not found")
    before = meal.to_dict()
    await meal.delete()
    await audit.record_change(user_id, "meal", "delete", before, {}, entity_id=meal_id)


async def award_xp_for_meal(user_id: str) -> Dict[str, Any]:
    """Award meal XP (capped per day) and return level info."""
    result = await gamification_service.award_action_xp(user_id, "meal")
    return {
        "xp_earned": result["xp_earned"],
        "total_xp": result["total_xp"],
        "new_level": result["level"],
        "title": result["title"],
        "leveled_up": result["leveled_up"],
    }


async def get_daily_nutrition(user_id: str, log_date: Optional[str] = None) -> List[Meal]:
    """Return the user's meals for a given ISO date (defaults to today)."""
    day = log_date or local_today_iso()
    return await Meal.get_by_date(user_id, day)


async def get_nutrition_summary(
    user_id: str, log_date: Optional[str] = None
) -> Dict[str, Any]:
    """Build a full daily nutrition summary with totals, goals and water."""
    day = log_date or local_today_iso()
    meals = await Meal.get_by_date(user_id, day)

    totals = {
        "calories": round(sum(m.calories for m in meals), 1),
        "protein": round(sum(m.protein for m in meals), 1),
        "carbs": round(sum(m.carbs for m in meals), 1),
        "fats": round(sum(m.fats for m in meals), 1),
        "fiber": round(sum(m.fiber for m in meals), 1),
    }

    user = await User.get_by_id(user_id)
    targets = await user_service.get_targets(user) if user else None
    goals = _goals_from_targets(targets) if targets else _macro_goals(DEFAULT_TDEE)

    water_ml = await get_water(user_id, day)
    return {
        "date": day,
        "totals": totals,
        "goals": goals,
        "macro_percentages": calculate_macro_percentages(
            totals["protein"], totals["carbs"], totals["fats"]
        ),
        "calories_remaining": round(goals["calories"] - totals["calories"], 1),
        "water_ml": water_ml,
        "water_goal_ml": targets["water_ml"] if targets else None,
        "meals_logged": len(meals),
        "meals": [m.public_dict() for m in meals],
        # How the goals were worked out (None until the profile basics are known).
        "targets": targets,
    }


async def get_recent_meals(user_id: str) -> List[Dict[str, Any]]:
    """Distinct meals from the last month, most recent first, for quick re-logging."""
    since = (local_today() - timedelta(days=RECENT_MEAL_DAYS)).isoformat()
    seen: Dict[str, Dict[str, Any]] = {}
    for meal in await Meal.get_since(user_id, since):
        key = normalize(meal.name)
        if key in seen:
            seen[key]["times_logged"] += 1
            continue
        if len(seen) >= RECENT_MEAL_LIMIT:
            continue
        entry = meal.public_dict()
        entry["times_logged"] = 1
        seen[key] = entry
    return list(seen.values())


async def log_water(user_id: str, amount_ml: int) -> int:
    """Add water intake for today and return the new daily total (ml)."""
    return await add_water(user_id, amount_ml)


async def get_nutrition_history(user_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """Return per-day nutrition totals, newest date first, capped at ``days``."""
    dates = sorted(await Meal.get_dates(user_id), reverse=True)[:days]
    history: List[Dict[str, Any]] = []
    for day in dates:
        meals = await Meal.get_by_date(user_id, day)
        history.append(
            {
                "date": day,
                "calories": round(sum(m.calories for m in meals), 1),
                "protein": round(sum(m.protein for m in meals), 1),
                "carbs": round(sum(m.carbs for m in meals), 1),
                "fats": round(sum(m.fats for m in meals), 1),
                "fiber": round(sum(m.fiber for m in meals), 1),
                "meals_logged": len(meals),
            }
        )
    return history


# ---------------------------------------------------------------------------
# Personal food library
# ---------------------------------------------------------------------------
def _totals_of(items: List[Dict[str, Any]]) -> Dict[str, float]:
    total = Nutrients()
    for item in items:
        total = total.plus(Nutrients(**item["nutrients"]))
    return total.model_dump()


async def create_saved_meal(
    user_id: str,
    name: str,
    items: List[Dict[str, Any]],
    meal_type: Optional[str] = None,
    from_meal_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Save foods as a reusable meal, from explicit items or a logged meal.

    Raises:
        NutritionServiceError: if neither source provides any foods.
    """
    if from_meal_id:
        meal = await Meal.get_for_user(user_id, from_meal_id)
        if meal is None:
            raise NutritionServiceError("Meal not found")
        items = meal.items or [{
            "name": meal.name, "source": "manual", "verified": False, "quantity": 1,
            "unit": "serving", "grams": 0, "edited": False,
            "nutrients": {"kcal": meal.calories, "protein": meal.protein, "carbs": meal.carbs,
                          "fat": meal.fats, "fiber": meal.fiber},
        }]
        meal_type = meal_type or meal.meal_type
    if not items:
        raise NutritionServiceError("A saved meal needs at least one food")
    return await SavedMeal.create(user_id, name, items, _totals_of(items), meal_type)


async def list_saved_meals(user_id: str) -> List[Dict[str, Any]]:
    return await SavedMeal.list(user_id)


async def delete_saved_meal(user_id: str, saved_id: str) -> None:
    if not await SavedMeal.delete(user_id, saved_id):
        raise NutritionServiceError("Saved meal not found")


async def log_saved_meal(
    user_id: str, saved_id: str, meal_type: Optional[str] = None, eaten_at: Optional[str] = None
) -> Meal:
    """Log a saved meal for today in one step.

    Raises:
        NutritionServiceError: if the saved meal doesn't exist.
    """
    saved = await SavedMeal.get(user_id, saved_id)
    if saved is None:
        raise NutritionServiceError("Saved meal not found")
    totals = saved["totals"]
    meal = await log_meal(
        user_id,
        saved["name"],
        totals["kcal"],
        totals["protein"],
        totals["carbs"],
        totals["fat"],
        fiber=totals.get("fiber", 0),
        meal_type=meal_type or saved.get("meal_type"),
        eaten_at=eaten_at,
        items=saved["items"],
    )
    await SavedMeal.mark_logged(user_id, saved)
    return meal


async def create_user_food(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Add a custom food/recipe; it's matched before the public datasets."""
    aliases = [a for a in (re.sub(r"\s+", " ", a).strip() for a in data.get("aliases", [])) if a]
    return await UserFood.create(
        user_id,
        data["name"].strip(),
        data.get("serving_unit", "serving"),
        data.get("serving_grams", 100),
        {
            "kcal": data["calories"],
            "protein": data.get("protein", 0),
            "carbs": data.get("carbs", 0),
            "fat": data.get("fats", 0),
            "fiber": data.get("fiber", 0),
        },
        aliases,
    )


async def list_user_foods(user_id: str) -> List[Dict[str, Any]]:
    return await UserFood.list(user_id)


async def delete_user_food(user_id: str, food_id: str) -> None:
    if not await UserFood.delete(user_id, food_id):
        raise NutritionServiceError("Food not found")
