"""Healthy treats: options for a craving, and logging the one picked.

A logged treat is an ordinary meal (so totals, XP and the rest-of-day portion
hints all work as usual) plus a small ``treat_logs`` record that lets the app
count treats this week. A treat whose meal was deleted no longer counts.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from app.health.store import Store
from app.models.nutrition import Meal
from app.models.user import User
from app.nutrition import treats
from app.nutrition.diet_rules import DietRules
from app.services import fasting_service, health_profile_service, nutrition_service
from app.utils.time import local_today

TREAT_LOGS = Store("treat_logs")


class TreatError(Exception):
    """An unknown craving or treat, or a treat that doesn't suit the person."""


async def _rules(user_id: str) -> DietRules:
    user = await User.get_by_id(user_id)
    rules = DietRules.from_preferences(user.food_preferences if user else None)
    mode = await fasting_service.active_mode(user_id)
    return rules.with_fasting_mode((mode or {}).get("mode"))


async def week_status(user_id: str) -> Dict[str, int]:
    """Treats logged since Monday (meals still on record) against the suggestion."""
    today = local_today()
    monday = (today - timedelta(days=today.weekday())).isoformat()
    meal_ids = [meal.id for meal in await Meal.get_since(user_id, monday)]
    logged = await TREAT_LOGS.find({"user_id": user_id, "meal_id": {"$in": meal_ids}}) if meal_ids else []
    return {"logged": len(logged), "suggested": treats.TREATS_PER_WEEK}


async def options(user_id: str, craving: str) -> Dict[str, Any]:
    """Treats for a craving that suit this person, with today's room and this week's count.

    Raises:
        TreatError: for an unknown craving.
    """
    if craving not in treats.cravings():
        raise TreatError("Unknown craving")
    flags = await health_profile_service.health_flags(user_id)
    summary = await nutrition_service.get_nutrition_summary(user_id)
    return {
        "craving": craving,
        "options": treats.options(craving, await _rules(user_id), flags),
        "calories_remaining": summary["calories_remaining"],
        "week": await week_status(user_id),
    }


async def log_treat(user_id: str, treat_id: str, meal_type: Optional[str] = None) -> Meal:
    """Log a treat as a meal and count it for the week.

    Raises:
        TreatError: for an unknown treat or one the person shouldn't have
            (an allergy, their diet, or a sugary treat with high blood sugar).
    """
    treat = treats.get_treat(treat_id)
    if treat is None:
        raise TreatError("Unknown treat")
    flags = await health_profile_service.health_flags(user_id)
    if not treats.allowed(treat, await _rules(user_id), flags):
        raise TreatError("This treat doesn't suit your diet or health profile")
    total = treats.totals(treat)
    meal = await nutrition_service.log_meal(
        user_id,
        name=treat.name,
        calories=total.kcal,
        protein=total.protein,
        carbs=total.carbs,
        fats=total.fat,
        fiber=total.fiber,
        meal_type=meal_type or "snack",
        items=treats.meal_items(treat),
    )
    await TREAT_LOGS.insert({
        "id": str(uuid4()),
        "user_id": user_id,
        "treat_id": treat.id,
        "meal_id": meal.id,
        "local_date": meal.log_date,
        "created_at": datetime.now(timezone.utc),
    })
    return meal
