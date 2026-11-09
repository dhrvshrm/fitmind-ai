"""Meal plans: create, adjust and log from them (see app/nutrition/meal_planner.py).

Edits always re-apply the person's current diet rules, so a plan can never
offer a food they've since said they're allergic to. Each change is saved
as a new version of the plan.
"""
import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

from app.ai.client import AIError, AIQuotaError
from app.config.settings import get_settings
from app.models import audit, diet_plan
from app.models.user import User
from app.nutrition import food_db, meal_planner
from app.nutrition.diet_rules import DietRules
from app.nutrition.food_db import Food
from app.services import nutrition_service, user_service
from app.utils.time import local_today, local_today_iso

logger = logging.getLogger(__name__)

TARGET_KEYS = ("calories", "protein", "carbs", "fats", "fiber")
# Answers that change which foods are allowed; a plan made before they changed is out of date.
PREFERENCE_KEYS = ("diet_type", "eats_eggs", "eats_dairy", "allergies", "intolerances", "excluded", "dislikes")
# A plan is out of date when today's targets differ from the plan's by more than this.
STALE_CALORIE_FRACTION = 0.03
STALE_PROTEIN_FRACTION = 0.05
# Days of "logged from plan" history kept on the plan.
LOGGED_DAYS_KEPT = 7
# Target flags that call for a professional's advice alongside any plan.
MEDICAL_FLAGS = {"minor", "pregnancy_or_breastfeeding"}


class DietPlanError(Exception):
    """A plan request that can't be completed; ``kind`` maps to the HTTP status."""

    def __init__(self, message: str, kind: str = "invalid"):
        super().__init__(message)
        self.kind = kind


class _Context:
    """Everything a plan change needs about the person, loaded once."""

    def __init__(self, user: User, targets: Dict[str, Any], pool: List[Food], rules: DietRules):
        self.user = user
        self.targets = targets
        self.pool = pool
        self.rules = rules
        self.foods = {f.id: f for f in pool}
        self.prefs = user.food_preferences or {}
        self.access = user.food_access or {}


async def _context(user_id: str) -> _Context:
    user = await User.get_by_id(user_id)
    if user is None:
        raise DietPlanError("User not found", "not_found")
    targets = await user_service.get_targets(user)
    if not targets:
        raise DietPlanError("Add your age, sex, height and weight in your profile to get a meal plan")
    rules = DietRules.from_preferences(user.food_preferences)
    own = await nutrition_service.user_foods_as_foods(user_id)
    pool = meal_planner.food_pool(rules, user.food_preferences, own)
    return _Context(user, targets, pool, rules)


def _ai_error(error: AIError) -> DietPlanError:
    settings = get_settings()
    if not (settings.GEMINI_API_KEY or settings.GROQ_API_KEY):
        return DietPlanError("Meal planning isn't set up on this server yet", "unavailable")
    if isinstance(error, AIQuotaError):
        return DietPlanError("You've used today's AI requests. Please try again tomorrow", "unavailable")
    return DietPlanError("Couldn't create a plan right now. Please try again", "unavailable")


def _target_subset(targets: Dict[str, Any]) -> Dict[str, int]:
    return {key: targets[key] for key in TARGET_KEYS}


def _preferences(prefs: Dict[str, Any]) -> Dict[str, Any]:
    return {key: prefs.get(key) for key in PREFERENCE_KEYS}


def _notes(meals: List[dict], plan_targets: Dict[str, int], ctx: _Context) -> List[dict]:
    notes = []
    short = meal_planner.protein_note(meals, plan_targets)
    if short:
        notes.append(short)
    if ctx.prefs.get("allergies") or ctx.prefs.get("intolerances") or ctx.prefs.get("diet_type") in ("jain", "vegan"):
        notes.append({"code": "check_ingredients", "values": {}})
    if set(ctx.targets.get("flags") or []) & MEDICAL_FLAGS:
        notes.append({"code": "medical_advice", "values": {}})
    return notes


def _remove_disallowed(meals: List[dict], ctx: _Context) -> None:
    """Last line of defence: drop any food the current rules forbid."""
    for meal in meals:
        kept = [i for i in meal["items"] if i["food_id"] in ctx.foods and ctx.rules.allows(ctx.foods[i["food_id"]])]
        if len(kept) != len(meal["items"]):
            logger.warning("Removed disallowed foods from a plan meal %s", meal["id"])
        meal["items"] = kept
        meal["totals"] = meal_planner.totals_of(kept)


async def _save(user_id: str, meals: List[dict], plan_targets: Dict[str, int], ctx: _Context,
                change: str, previous: Optional[dict]) -> dict:
    fields = {
        "targets": plan_targets,
        "preferences": _preferences(ctx.prefs),
        "meals": meals,
        "totals": meal_planner.totals_of([i for m in meals for i in m["items"]]),
        "notes": _notes(meals, plan_targets, ctx),
    }
    doc = await diet_plan.save_version(user_id, fields, change, previous)
    await audit.record_change(
        user_id,
        "diet_plan",
        change,
        before={"version": previous["version"]} if previous else None,
        after={"version": doc["version"]},
        actor=audit.ACTOR_AI if doc["created_by"] == "ai" else audit.ACTOR_USER,
        entity_id=doc["id"],
    )
    return doc


def _is_stale(plan: dict, user: User, targets: Optional[Dict[str, Any]]) -> bool:
    """True when the profile has moved on since the plan was made."""
    if not targets:
        return False
    planned = plan["targets"]
    if abs(targets["calories"] - planned["calories"]) > planned["calories"] * STALE_CALORIE_FRACTION:
        return True
    if abs(targets["protein"] - planned["protein"]) > planned["protein"] * STALE_PROTEIN_FRACTION:
        return True
    return _preferences(user.food_preferences or {}) != plan.get("preferences")


async def _present(plan: dict, user: Optional[User] = None) -> dict:
    """The plan as returned to the app, with today's logging state and staleness."""
    user = user or await User.get_by_id(plan["user_id"])
    targets = await user_service.get_targets(user) if user else None
    data = {k: v for k, v in plan.items() if k not in ("user_id", "logged")}
    data["logged_today"] = plan.get("logged", {}).get(local_today_iso(), [])
    data["stale"] = bool(user) and _is_stale(plan, user, targets)
    return data


async def _active(user_id: str) -> dict:
    plan = await diet_plan.get_active(user_id)
    if plan is None:
        raise DietPlanError("You don't have a meal plan yet", "not_found")
    return plan


def _meal(plan: dict, meal_id: str) -> dict:
    meal = next((m for m in plan["meals"] if m["id"] == meal_id), None)
    if meal is None:
        raise DietPlanError("Meal not found in your plan", "not_found")
    return meal


def _item(meal: dict, index: int) -> dict:
    if not 0 <= index < len(meal["items"]):
        raise DietPlanError("Food not found in this meal", "not_found")
    return meal["items"][index]


def _copy_meals(plan: dict) -> List[dict]:
    return [{**m, "items": [dict(i) for i in m["items"]]} for m in plan["meals"]]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def get_plan(user_id: str) -> Optional[dict]:
    """The user's current plan, or None."""
    plan = await diet_plan.get_active(user_id)
    return await _present(plan) if plan else None


async def create_plan(user_id: str) -> dict:
    """Make a new plan from current targets and answers (replacing any current one).

    Raises:
        DietPlanError: if targets can't be computed yet or the AI is unavailable.
    """
    ctx = await _context(user_id)
    previous = await diet_plan.get_active(user_id)
    slots = meal_planner.plan_slots(ctx.user.lifestyle)
    # A new plan should feel new: steer away from the dishes in the last one.
    avoid = [i["name"] for m in previous["meals"] for i in m["items"]] if previous else []
    plan_targets = _target_subset(ctx.targets)
    try:
        pick = await meal_planner.pick_meals(
            plan_targets, slots, ctx.pool, ctx.prefs, ctx.access, user_id, avoid_names=avoid
        )
    except AIError as e:
        logger.info("Meal plan generation failed for %s: %s", user_id, e)
        raise _ai_error(e) from e
    meals = meal_planner.assemble(pick, slots, ctx.foods)
    _remove_disallowed(meals, ctx)
    meal_planner.fit_portions(meals, plan_targets, ctx.foods)
    doc = await _save(user_id, meals, plan_targets, ctx, "regenerated" if previous else "created", previous)
    return await _present(doc, ctx.user)


async def regenerate_meal(user_id: str, meal_id: str) -> dict:
    """Replace one meal with a different option, keeping the rest of the day.

    Raises:
        DietPlanError: if there's no plan or meal, or the AI is unavailable.
    """
    plan = await _active(user_id)
    current = _meal(plan, meal_id)
    ctx = await _context(user_id)
    slot = {k: current[k] for k in ("id", "meal_type", "time", "share")}
    others = [m for m in plan["meals"] if m["id"] != meal_id]
    pool = meal_planner.pool_without_meal(ctx.pool, current["items"])
    try:
        pick = await meal_planner.pick_meals(
            plan["targets"], [slot], pool, ctx.prefs, ctx.access, user_id,
            avoid_names=[i["name"] for i in current["items"]], keep=others,
        )
    except AIError as e:
        raise _ai_error(e) from e
    meals = _copy_meals(plan)
    new_meal = meal_planner.assemble(pick, [slot], ctx.foods)[0]
    meals[[m["id"] for m in meals].index(meal_id)] = new_meal
    _remove_disallowed([new_meal], ctx)
    meal_planner.fit_portions(meals, plan["targets"], ctx.foods, fixed=[m["id"] for m in others])
    doc = await _save(user_id, meals, plan["targets"], ctx, "meal_regenerated", plan)
    return await _present(doc, ctx.user)


async def swap_options(user_id: str, meal_id: str, index: int, query: Optional[str] = None) -> List[dict]:
    """Foods that could replace one item, sized to roughly the same calories."""
    plan = await _active(user_id)
    meal = _meal(plan, meal_id)
    item = _item(meal, index)
    ctx = await _context(user_id)
    exclude = {i["food_id"] for i in meal["items"]}
    original = ctx.foods.get(item["food_id"]) or food_db.get_food(item["food_id"])
    return meal_planner.swap_options(item, ctx.pool, exclude, query, original)


async def swap_item(user_id: str, meal_id: str, index: int, food_id: str) -> dict:
    """Replace one food with another allowed food of about the same calories.

    Raises:
        DietPlanError: if the plan, meal or item is missing, or the food isn't allowed.
    """
    plan = await _active(user_id)
    original = _item(_meal(plan, meal_id), index)
    ctx = await _context(user_id)
    food = ctx.foods.get(food_id)
    if food is None:
        raise DietPlanError("That food can't be added to your plan")
    per_serving = food.per_100g.scaled(food.serving.grams / 100).kcal or 1
    replacement = meal_planner.build_item(
        food, meal_planner.snap(food, original["nutrients"]["kcal"] / per_serving)
    )
    meals = _copy_meals(plan)
    meal = next(m for m in meals if m["id"] == meal_id)
    meal["items"][index] = replacement
    meal["totals"] = meal_planner.totals_of(meal["items"])
    doc = await _save(user_id, meals, plan["targets"], ctx, "item_swapped", plan)
    return await _present(doc, ctx.user)


async def log_plan_meal(user_id: str, meal_id: str):
    """Log one planned meal as eaten today.

    Returns:
        (the logged Meal, the plan as presented).

    Raises:
        DietPlanError: if there's no plan or meal, or it was already logged today.
    """
    plan = await _active(user_id)
    meal = _meal(plan, meal_id)
    today = local_today_iso()
    logged = {d: ids for d, ids in plan.get("logged", {}).items()
              if d >= (local_today() - timedelta(days=LOGGED_DAYS_KEPT)).isoformat()}
    if meal_id in logged.get(today, []):
        raise DietPlanError("You've already logged this meal today")
    totals = meal["totals"]
    logged_meal = await nutrition_service.log_meal(
        user_id,
        name=", ".join(i["name"] for i in meal["items"]),
        calories=totals["kcal"],
        protein=totals["protein"],
        carbs=totals["carbs"],
        fats=totals["fat"],
        fiber=totals["fiber"],
        meal_type=meal["meal_type"],
        eaten_at=meal["time"],
        items=[{**{k: v for k, v in i.items() if k != "per_100g"}, "edited": False} for i in meal["items"]],
    )
    logged[today] = [*logged.get(today, []), meal_id]
    await diet_plan.set_logged(user_id, plan["id"], logged)
    return logged_meal, await _present({**plan, "logged": logged})
