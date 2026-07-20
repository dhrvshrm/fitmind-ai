import logging
from datetime import date as date_cls
from typing import Any, Dict, List, Optional

from app.models.gamification import XP_REWARDS
from app.models.nutrition import Meal, add_water, get_water
from app.models.user import User
from app.services import gamification_service

logger = logging.getLogger(__name__)

# Default macro split (fraction of daily calories) and a TDEE fallback for
# users who have not completed onboarding.
MACRO_SPLIT = {"protein": 0.30, "carbs": 0.40, "fats": 0.30}
DEFAULT_TDEE = 2000

# Calories per gram of each macronutrient.
CALS_PER_GRAM = {"protein": 4, "carbs": 4, "fats": 9}


class NutritionServiceError(Exception):
    """Raised when a nutrition-service operation fails (e.g. user not found)."""


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
    }


async def log_meal(
    user_id: str,
    name: str,
    calories: float,
    protein: float = 0,
    carbs: float = 0,
    fats: float = 0,
) -> Meal:
    """Persist a logged meal for the user and return it."""
    meal = Meal(user_id, name, calories, protein, carbs, fats)
    await meal.save()
    return meal


async def award_xp_for_meal(user_id: str) -> Dict[str, Any]:
    """Award meal XP via the gamification engine and return level info."""
    result = await gamification_service.award_xp(user_id, XP_REWARDS["meal"])
    return {
        "xp_earned": result["xp_earned"],
        "total_xp": result["total_xp"],
        "new_level": result["level"],
        "title": result["title"],
        "leveled_up": result["leveled_up"],
    }


async def get_daily_nutrition(user_id: str, log_date: Optional[str] = None) -> List[Meal]:
    """Return the user's meals for a given ISO date (defaults to today)."""
    day = log_date or date_cls.today().isoformat()
    return await Meal.get_by_date(user_id, day)


async def get_nutrition_summary(
    user_id: str, log_date: Optional[str] = None
) -> Dict[str, Any]:
    """Build a full daily nutrition summary with totals, goals and water."""
    day = log_date or date_cls.today().isoformat()
    meals = await Meal.get_by_date(user_id, day)

    totals = {
        "calories": round(sum(m.calories for m in meals), 1),
        "protein": round(sum(m.protein for m in meals), 1),
        "carbs": round(sum(m.carbs for m in meals), 1),
        "fats": round(sum(m.fats for m in meals), 1),
    }

    user = await User.get_by_id(user_id)
    tdee = user.tdee if user and user.tdee else DEFAULT_TDEE
    goals = _macro_goals(tdee)

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
        "meals_logged": len(meals),
        "meals": [
            {
                "id": m.id,
                "name": m.name,
                "calories": m.calories,
                "protein": m.protein,
                "carbs": m.carbs,
                "fats": m.fats,
                "date": m.log_date,
            }
            for m in meals
        ],
    }


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
                "meals_logged": len(meals),
            }
        )
    return history
