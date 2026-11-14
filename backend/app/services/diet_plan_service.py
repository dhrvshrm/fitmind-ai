"""Meal plans: create, adjust and log from them (see app/nutrition/meal_planner.py).

Edits always re-apply the person's current diet rules, so a plan can never
offer a food they've since said they're allergic to. Each change is saved
as a new version of the plan.
"""
import logging
from datetime import timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional

from app.ai.client import AIError, AIQuotaError
from app.config.settings import get_settings
from app.models import audit, diet_plan
from app.models.user import User
from app.nutrition import cooking_fat, day_sync, food_db, meal_planner, routine
from app.nutrition.diet_rules import DietRules
from app.nutrition.food_db import Food
from app.services import nutrition_service, user_service
from app.nutrition import fasting, grocery  # Phase 8: fasting modes and grocery list
from app.services import fasting_service
from app.services import analytics_service
from app.health import plan_rules  # Phase 12 health rules
from app.utils.time import get_current_timezone, local_today, local_today_iso

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
    # An active fasting or festival mode adds its food rules, like an allergy would.
    fasting_mode = await fasting_service.active_mode(user_id)
    rules = rules.with_fasting_mode((fasting_mode or {}).get("mode"))
    own = await nutrition_service.user_foods_as_foods(user_id)
    pool = meal_planner.food_pool(rules, user.food_preferences, own)
    # Health profile rules (app/health/plan_rules.py), from consented data only.
    targets, pool, health_notes = await plan_rules.apply_to_plan(user_id, targets, pool, user.weight_kg)
    ctx = _Context(user, targets, pool, rules)
    ctx.health_notes = health_notes
    ctx.fasting_mode = fasting_mode
    return ctx


def _target_subset(targets: Dict[str, Any]) -> Dict[str, int]:
    return {key: targets[key] for key in TARGET_KEYS}


def _preferences(prefs: Dict[str, Any]) -> Dict[str, Any]:
    return {key: prefs.get(key) for key in PREFERENCE_KEYS}


def _notes(meals: List[dict], plan_targets: Dict[str, int], ctx: _Context,
           rule_based: bool = False) -> List[dict]:
    notes = []
    if rule_based:
        notes.append({"code": "rule_based", "values": {}})
    short = meal_planner.protein_note(meals, plan_targets)
    if short:
        notes.append(short)
    if ctx.prefs.get("allergies") or ctx.prefs.get("intolerances") or ctx.prefs.get("diet_type") in ("jain", "vegan"):
        notes.append({"code": "check_ingredients", "values": {}})
    if set(ctx.targets.get("flags") or []) & MEDICAL_FLAGS:
        notes.append({"code": "medical_advice", "values": {}})
    notes += [n for n in getattr(ctx, "health_notes", []) if n["code"] not in {x["code"] for x in notes}]
    notes += [n for n in _mode_notes(getattr(ctx, "fasting_mode", None)) if n["code"] not in {x["code"] for x in notes}]
    return notes


# --- Fasting modes and shift times (Phase 8) ----------------------------------
def _mode_summary(mode: Optional[dict]) -> Optional[dict]:
    """What a plan stores about the fasting mode it was made for."""
    if not mode:
        return None
    keys = ("id", "mode", "start_date", "end_date", "dawn_time", "sunset_time", "times_given")
    return {k: mode[k] for k in keys if k in mode}


def _mode_notes(mode: Optional[dict]) -> List[dict]:
    """Plan notes saying a mode is on, and what it means for the day."""
    spec = fasting.get_mode((mode or {}).get("mode"))
    if spec is None:
        return []
    notes = [{"code": "fasting_mode", "values": {"mode": spec.key, "end_date": mode["end_date"]}}]
    for code in spec.note_codes:
        if code == "ramadan_timings":
            notes.append({"code": code, "values": {
                "dawn": mode.get("dawn_time"), "sunset": mode.get("sunset_time"),
                "given": bool(mode.get("times_given")),
            }})
        else:
            notes.append({"code": code, "values": {}})
    if spec.restricts_food:
        notes.append({"code": "check_ingredients", "values": {}})
    return notes


def _mode_lines(mode: Optional[dict]) -> List[str]:
    """Extra planner instructions for an active mode."""
    spec = fasting.get_mode((mode or {}).get("mode"))
    return [spec.prompt] if spec and spec.prompt else []


def _mode_key(mode: Optional[dict]) -> Optional[str]:
    return (mode or {}).get("mode")


def _current_times(plan: dict, user: Optional[User], mode: Optional[dict]) -> Optional[Dict[str, str]]:
    """Meal times from the person's routine as it is now (a new shift, new wake time),
    or None when the plan's meals no longer match the routine's slots."""
    if user is None:
        return None
    slots = meal_planner.plan_slots(user.lifestyle, user.workout_time, _trains(user), mode)
    times = {s["id"]: s["time"] for s in slots}
    return times if set(times) == {m["id"] for m in plan["meals"]} else None


def _remove_disallowed(meals: List[dict], ctx: _Context) -> None:
    """Last line of defence: drop any food the current rules forbid."""
    for meal in meals:
        kept = [i for i in meal["items"] if i["food_id"] in ctx.foods and ctx.rules.allows(ctx.foods[i["food_id"]])]
        if len(kept) != len(meal["items"]):
            logger.warning("Removed disallowed foods from a plan meal %s", meal["id"])
        meal["items"] = kept
        meal["totals"] = meal_planner.totals_of(kept)


async def _save(user_id: str, meals: List[dict], plan_targets: Dict[str, int], ctx: _Context,
                change: str, previous: Optional[dict], rule_based: bool = False) -> dict:
    fields = {
        "targets": plan_targets,
        "preferences": _preferences(ctx.prefs),
        "meals": meals,
        "totals": meal_planner.totals_of([i for m in meals for i in m["items"]]),
        "notes": _notes(meals, plan_targets, ctx, rule_based),
        # A whole new plan is made for today's mode; edits keep the plan's own.
        "fasting_mode": (
            _mode_summary(getattr(ctx, "fasting_mode", None))
            if previous is None or change in ("created", "regenerated")
            else previous.get("fasting_mode")
        ),
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
    if user:  # Compare against health-adjusted targets, as the plan was made with them.
        targets = await plan_rules.adjusted_targets(user.id, targets, user.weight_kg)
    data = {k: v for k, v in plan.items() if k not in ("user_id", "logged", "logged_links")}
    data["stale"] = bool(user) and _is_stale(plan, user, targets)
    # Fasting mode on today, and whether the plan was made for it.
    active = await fasting_service.active_mode(plan["user_id"])
    data["fasting_mode"] = plan.get("fasting_mode")
    data["active_fasting_mode"] = _mode_summary(active)
    data["mode_changed"] = _mode_key(active) != _mode_key(plan.get("fasting_mode"))
    # Meal times follow the routine as it is now (a new shift moves them, foods stay).
    times = _current_times(plan, user, plan.get("fasting_mode"))
    if times:
        data["meals"] = [{**m, "time": times[m["id"]]} for m in plan["meals"]]
    # How much oil, ghee or butter each dish assumes (already in its calories).
    data["meals"] = cooking_fat.annotate(data["meals"])
    data["stale"] = data["stale"] or data["mode_changed"] or (bool(user) and times is None)
    data["shift_aware"] = bool(user) and routine.is_shift_schedule(user.lifestyle)
    # Today's food log laid over the plan: hand-logged meals fill their slots,
    # and the meals still to come get a portion hint.
    today = local_today_iso()
    logs = [_log_view(m) for m in await nutrition_service.get_daily_nutrition(plan["user_id"], today)]
    sync = day_sync.sync_day(
        data["meals"],
        plan.get("logged", {}).get(today, []),
        plan.get("logged_links", {}).get(today, {}),
        logs,
        plan["targets"],
    )
    data["logged_today"] = sync["logged_ids"]
    data["today"] = {"meals": sync["meals"], "day": sync["day"]}
    data["routine"] = routine.daily_routine(
        data["meals"],
        user.lifestyle if user else None,
        user.workout_time if user else None,
        _trains(user) if user else False,
        (targets or {}).get("water_ml"),
        plan.get("fasting_mode"),
    )
    return data


def _log_view(meal) -> dict:
    """A logged meal as day_sync reads it, with the local time it was eaten or logged."""
    time = meal.eaten_at
    if not time and meal.created_at:
        created = meal.created_at if meal.created_at.tzinfo else meal.created_at.replace(tzinfo=timezone.utc)
        time = created.astimezone(ZoneInfo(get_current_timezone())).strftime("%H:%M")
    return {
        "id": meal.id,
        "name": meal.name,
        "calories": meal.calories,
        "protein": meal.protein,
        "meal_type": meal.meal_type,
        "eaten_at": meal.eaten_at,
        "time": time,
    }


def _trains(user: User) -> bool:
    return (user.workout_days_per_week or 0) > 0


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


async def _logged_today(plan: dict, meal_id: str) -> bool:
    """Whether the meal was logged from the plan today and that log still exists.

    Deleting the log from the food diary opens the meal again.
    """
    today = local_today_iso()
    if meal_id not in plan.get("logged", {}).get(today, []):
        return False
    link = plan.get("logged_links", {}).get(today, {}).get(meal_id)
    if not link:  # Logged before links were recorded.
        return True
    logs = await nutrition_service.get_daily_nutrition(plan["user_id"], today)
    return any(m.id == link for m in logs)


async def _ensure_not_logged_today(plan: dict, meal_id: str) -> None:
    """A meal already logged today can't be changed: what was eaten is on record."""
    if await _logged_today(plan, meal_id):
        raise DietPlanError("This meal is already logged for today. You can change it from tomorrow")


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
    mode = getattr(ctx, "fasting_mode", None)
    slots = meal_planner.plan_slots(ctx.user.lifestyle, ctx.user.workout_time, _trains(ctx.user), mode)
    # A new plan should feel new: steer away from the dishes in the last one.
    avoid = [i["name"] for m in previous["meals"] for i in m["items"]] if previous else []
    plan_targets = _target_subset(ctx.targets)
    rule_based = False
    try:
        pick = await meal_planner.pick_meals(
            plan_targets, slots, ctx.pool, ctx.prefs, ctx.access, user_id, avoid_names=avoid,
            extra_lines=_mode_lines(mode),
        )
    except AIError as e:
        # A plan is always made: without AI, from the same allowed foods by meal templates.
        logger.info("AI meal plan unavailable for %s, using rules: %s", user_id, e)
        variant = previous["version"] if previous else 0
        pick = meal_planner.rule_based_pick(slots, ctx.pool, variant, _mode_key(mode))
        rule_based = True
    meals = meal_planner.assemble(pick, slots, ctx.foods)
    _remove_disallowed(meals, ctx)
    meal_planner.fit_portions(meals, plan_targets, ctx.foods)
    doc = await _save(user_id, meals, plan_targets, ctx, "regenerated" if previous else "created",
                      previous, rule_based)
    await analytics_service.track(
        user_id, analytics_service.MEAL_PLAN_CREATED, {"source": "rules" if rule_based else "ai"}
    )
    return await _present(doc, ctx.user)


async def regenerate_meal(user_id: str, meal_id: str) -> dict:
    """Replace one meal with a different option, keeping the rest of the day.

    Raises:
        DietPlanError: if there's no plan or meal, or the AI is unavailable.
    """
    plan = await _active(user_id)
    current = _meal(plan, meal_id)
    await _ensure_not_logged_today(plan, meal_id)
    ctx = await _context(user_id)
    slot = {k: current[k] for k in ("id", "meal_type", "time", "share")}
    others = [m for m in plan["meals"] if m["id"] != meal_id]
    pool = meal_planner.pool_without_meal(ctx.pool, current["items"])
    rule_based = False
    try:
        pick = await meal_planner.pick_meals(
            plan["targets"], [slot], pool, ctx.prefs, ctx.access, user_id,
            avoid_names=[i["name"] for i in current["items"]], keep=others,
            extra_lines=_mode_lines(getattr(ctx, "fasting_mode", None)),
        )
    except AIError as e:
        logger.info("AI meal option unavailable for %s, using rules: %s", user_id, e)
        others_ids = {i["food_id"] for m in others for i in m["items"]}
        pick = meal_planner.rule_based_pick([slot], [f for f in pool if f.id not in others_ids], plan["version"],
                                            _mode_key(getattr(ctx, "fasting_mode", None)))
        rule_based = True
    meals = _copy_meals(plan)
    new_meal = meal_planner.assemble(pick, [slot], ctx.foods)[0]
    meals[[m["id"] for m in meals].index(meal_id)] = new_meal
    _remove_disallowed([new_meal], ctx)
    meal_planner.fit_portions(meals, plan["targets"], ctx.foods, fixed=[m["id"] for m in others])
    doc = await _save(user_id, meals, plan["targets"], ctx, "meal_regenerated", plan, rule_based)
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
    await _ensure_not_logged_today(plan, meal_id)
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
    if await _logged_today(plan, meal_id):
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
        # The time shown in the plan, which follows the current routine (see _present).
        eaten_at=(_current_times(plan, await User.get_by_id(user_id), plan.get("fasting_mode")) or {}).get(
            meal_id, meal["time"]
        ),
        items=[{**{k: v for k, v in i.items() if k != "per_100g"}, "edited": False} for i in meal["items"]],
    )
    logged[today] = [*(i for i in logged.get(today, []) if i != meal_id), meal_id]
    links = {d: ids for d, ids in plan.get("logged_links", {}).items() if d in logged}
    links[today] = {**links.get(today, {}), meal_id: logged_meal.id}
    await diet_plan.set_logged(user_id, plan["id"], logged, links)
    return logged_meal, await _present({**plan, "logged": logged, "logged_links": links})


async def grocery_list(user_id: str, days: int = grocery.DEFAULT_DAYS) -> dict:
    """The current plan's dishes over ``days`` days as one shopping list, grouped by aisle.

    Returns ``grocery.build_list`` output plus ``plan_id``, ``plan_version``
    and the plan's ``fasting_mode`` (so the list can say it's for a fast).

    Raises:
        DietPlanError: if there's no plan or ``days`` is out of range (1 to 14).
    """
    if not 1 <= days <= grocery.MAX_DAYS:
        raise DietPlanError(f"Pick between 1 and {grocery.MAX_DAYS} days")
    plan = await _active(user_id)
    return {
        # Follow the fast the plan was made for: no onion or garlic in a Navratri list.
        **grocery.build_list(plan["meals"], days, fasting.get_mode((plan.get("fasting_mode") or {}).get("mode"))),
        "plan_id": plan["id"],
        "plan_version": plan["version"],
        "fasting_mode": plan.get("fasting_mode"),
    }
