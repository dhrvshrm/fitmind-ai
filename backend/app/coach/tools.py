"""The coach's built-in tools, each a thin wrapper over an existing service.

Read tools return compact facts. Action tools compute a :class:`Proposal`
with backend numbers in ``prepare`` and only change data in ``execute``,
which runs from the stored payload after the user confirms.
"""
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.coach.registry import (
    ActionResult,
    Change,
    NoArgs,
    Proposal,
    Tool,
    ToolContext,
    ToolError,
    register,
)
from app.models.user import User
from app.models.weight import WeightLog
from app.schemas.nutrition import MealItem, MealType
from app.services import (
    diet_plan_service,
    gamification_service,
    nutrition_service,
    recovery_service,
    workout_service,
)
from app.services.diet_plan_service import DietPlanError
from app.services.nutrition_service import NutritionServiceError

PlanSlot = Literal[
    "pre_workout", "breakfast", "mid_morning", "lunch", "evening_snack", "dinner", "bedtime"
]


class _Args(BaseModel):
    model_config = ConfigDict(extra="ignore")


def _r(value: float) -> int:
    return int(round(value or 0))


async def _user(ctx: ToolContext) -> User:
    user = await User.get_by_id(ctx.user_id)
    if user is None:
        raise ToolError("Account not found")
    return user


async def _remaining(user_id: str) -> Dict[str, int]:
    summary = await nutrition_service.get_nutrition_summary(user_id)
    totals, goals = summary["totals"], summary["goals"]
    return {
        "kcal": _r(goals["calories"] - totals["calories"]),
        "protein": _r(goals["protein"] - totals["protein"]),
    }


def _left_line(remaining: Dict[str, int]) -> str:
    kcal, protein = remaining["kcal"], remaining["protein"]
    kcal_part = f"{kcal} kcal left" if kcal >= 0 else f"{-kcal} kcal over"
    protein_part = f"{protein} g protein to go" if protein > 0 else "protein target met"
    return f"{kcal_part} today, {protein_part}."


# ---------------------------------------------------------------------------
# Read tools
# ---------------------------------------------------------------------------
async def nutrition_today(ctx: ToolContext, args: NoArgs) -> Dict[str, Any]:
    summary = await nutrition_service.get_nutrition_summary(ctx.user_id)
    totals, goals = summary["totals"], summary["goals"]
    return {
        "date": summary["date"],
        "eaten": {"kcal": _r(totals["calories"]), "protein": _r(totals["protein"]),
                  "carbs": _r(totals["carbs"]), "fat": _r(totals["fats"])},
        "targets": {"kcal": _r(goals["calories"]), "protein": _r(goals["protein"]),
                    "carbs": _r(goals["carbs"]), "fat": _r(goals["fats"])},
        "remaining": {"kcal": _r(goals["calories"] - totals["calories"]),
                      "protein": _r(goals["protein"] - totals["protein"])},
        "water_ml": summary["water_ml"],
        "water_goal_ml": summary["water_goal_ml"],
        "meals": [
            {"name": m["name"], "kcal": _r(m["calories"]), "protein": _r(m["protein"]),
             "meal_type": m.get("meal_type")}
            for m in summary["meals"]
        ],
    }


async def meal_plan(ctx: ToolContext, args: NoArgs) -> Dict[str, Any]:
    plan = await diet_plan_service.get_plan(ctx.user_id)
    if plan is None:
        return {"has_plan": False}
    logged = set(plan.get("logged_today") or [])
    return {
        "has_plan": True,
        "targets": plan.get("targets"),
        "meals": [
            {
                "meal": m["id"],
                "time": m.get("time"),
                "items": [f"{i['quantity']:g} {i['unit']} {i['name']}" for i in m["items"]],
                "kcal": _r(m["totals"]["kcal"]),
                "protein": _r(m["totals"]["protein"]),
                "logged_today": m["id"] in logged,
            }
            for m in plan["meals"]
        ],
    }


async def today_workout(ctx: ToolContext, args: NoArgs) -> Dict[str, Any]:
    today = await workout_service.get_today_workout(await _user(ctx))
    return {
        "day": today.get("day"),
        "focus": today.get("focus"),
        "type": today.get("workout_type"),
        "mode": today.get("mode"),
        "quick_session": today.get("quick"),
        "has_plan": today.get("has_plan"),
        "exercises": [
            {k: e.get(k) for k in ("name", "sets", "reps", "rest") if e.get(k)}
            for e in today.get("exercises", [])[:10]
        ],
    }


async def recovery(ctx: ToolContext, args: NoArgs) -> Dict[str, Any]:
    history = await recovery_service.get_recovery_history(ctx.user_id, days=7)
    score = await recovery_service.get_recovery_score(ctx.user_id)
    return {
        "latest_score": score if history else None,
        "recommendation": recovery_service.get_recommendation(score) if history else None,
        "last_7": [{"date": str(getattr(h, "log_date", "")), "score": h.score,
                    "sleep_hours": h.sleep_hours} for h in history],
    }


class WeightArgs(_Args):
    days: int = Field(30, ge=7, le=180, description="How many days back")


async def weight_trend(ctx: ToolContext, args: WeightArgs) -> Dict[str, Any]:
    logs = await WeightLog.get_history(ctx.user_id, days=args.days)
    points = [{"date": w.log_date, "kg": w.weight_kg} for w in logs]
    change = round(points[-1]["kg"] - points[0]["kg"], 1) if len(points) >= 2 else None
    return {"entries": points[-14:], "change_kg": change, "count": len(points)}


register(Tool("get_nutrition_today", "Today's eaten totals, targets, what's left, water, meals logged.",
              "read", run=nutrition_today))
register(Tool("get_meal_plan", "The user's current meal plan, meal by meal, and which are logged today.",
              "read", run=meal_plan))
register(Tool("get_today_workout", "Today's planned or quick workout session.", "read", run=today_workout))
register(Tool("get_recovery", "Latest recovery score and the last 7 check-ins.", "read", run=recovery))
register(Tool("get_weight_trend", "Recent body-weight entries and the change.", "read",
              args=WeightArgs, run=weight_trend))


# ---------------------------------------------------------------------------
# Action: log a meal from text
# ---------------------------------------------------------------------------
class LogMealArgs(_Args):
    description: str = Field(..., min_length=2, max_length=500,
                             description="What was eaten, with amounts, in the user's words")
    meal_type: Optional[MealType] = Field(None, description="breakfast, lunch, dinner or snack")


def meal_proposal_from_estimate(
    estimate: Dict[str, Any], meal_type: Optional[str], title: str = "Log this meal"
) -> Proposal:
    """A confirm card for logging an estimate from the nutrition pipeline.

    The estimate's numbers are what gets logged; nothing comes from the model.

    Raises:
        ToolError: when no food in the estimate could be resolved.
    """
    items: List[Dict[str, Any]] = []
    for item in estimate["items"]:
        if not item.get("nutrients"):
            continue
        try:
            items.append(MealItem(
                name=item["name"], food_id=item.get("food_id"), source=item["source"],
                verified=item["verified"], quantity=item["quantity"], unit=item["unit"],
                grams=item["grams"], nutrients=item["nutrients"],
            ).model_dump())
        except ValidationError:
            continue
    if not items:
        raise ToolError("Couldn't estimate that meal. Try naming the foods and amounts.")
    totals = {k: round(sum(i["nutrients"][k] for i in items), 1)
              for k in ("kcal", "protein", "carbs", "fat", "fiber")}
    skipped = len(estimate["items"]) - len(items)
    is_estimate = any(not i["verified"] for i in items)
    name = ", ".join(i["name"] for i in items)[:200]
    changes = [
        Change(label="Foods", value=", ".join(f"{i['quantity']:g} {i['unit']} {i['name']}" for i in items)),
        Change(label="Calories", value=f"{_r(totals['kcal'])} kcal"),
        Change(label="Protein", value=f"{_r(totals['protein'])} g"),
        Change(label="Carbs", value=f"{_r(totals['carbs'])} g"),
        Change(label="Fat", value=f"{_r(totals['fat'])} g"),
    ]
    summary = f"Adds {_r(totals['kcal'])} kcal and {_r(totals['protein'])} g protein to today."
    if skipped:
        summary += f" {skipped} food(s) couldn't be estimated and are left out."
    return Proposal(
        title=title,
        summary=summary,
        changes=changes,
        estimate=is_estimate,
        payload={"name": name, "meal_type": meal_type, "items": items, "totals": totals},
    )


async def prepare_log_meal(ctx: ToolContext, args: LogMealArgs) -> Proposal:
    estimate = await nutrition_service.estimate_meal(ctx.user_id, args.description)
    return meal_proposal_from_estimate(estimate, args.meal_type)


async def execute_log_meal(ctx: ToolContext, payload: Dict[str, Any]) -> ActionResult:
    totals = payload["totals"]
    try:
        meal = await nutrition_service.log_meal(
            ctx.user_id, name=payload["name"], calories=totals["kcal"], protein=totals["protein"],
            carbs=totals["carbs"], fats=totals["fat"], fiber=totals["fiber"],
            meal_type=payload.get("meal_type"), items=payload["items"],
        )
    except NutritionServiceError as e:
        raise ToolError(str(e)) from e
    xp = await nutrition_service.award_xp_for_meal(ctx.user_id)
    left = _left_line(await _remaining(ctx.user_id))
    return ActionResult(
        message=f"Logged {meal.name}: {_r(meal.calories)} kcal, {_r(meal.protein)} g protein. {left}",
        data={"meal": meal.public_dict(), "xp_earned": xp["xp_earned"]},
    )


register(Tool("log_meal", "Log food the user ate, from their description.", "action",
              args=LogMealArgs, prepare=prepare_log_meal, execute=execute_log_meal,
              invalidates=["nutrition", "dashboard", "gamification", "dietPlan"]))


# ---------------------------------------------------------------------------
# Action: log water
# ---------------------------------------------------------------------------
class WaterArgs(_Args):
    amount_ml: int = Field(..., ge=50, le=3000, description="Millilitres of water (a glass is 250)")


async def prepare_water(ctx: ToolContext, args: WaterArgs) -> Proposal:
    summary = await nutrition_service.get_nutrition_summary(ctx.user_id)
    after = summary["water_ml"] + args.amount_ml
    goal = summary.get("water_goal_ml")
    changes = [Change(label="Water", value=f"+{args.amount_ml} ml"),
               Change(label="Today after this", value=f"{after} ml" + (f" of {goal} ml" if goal else ""))]
    return Proposal(title="Log water", summary=f"Adds {args.amount_ml} ml of water to today.",
                    changes=changes, payload={"amount_ml": args.amount_ml})


async def execute_water(ctx: ToolContext, payload: Dict[str, Any]) -> ActionResult:
    total = await nutrition_service.log_water(ctx.user_id, int(payload["amount_ml"]))
    return ActionResult(message=f"Logged {payload['amount_ml']} ml of water. {total} ml today.",
                        data={"water_ml": total})


register(Tool("log_water", "Log water the user drank.", "action", args=WaterArgs,
              prepare=prepare_water, execute=execute_water, invalidates=["nutrition", "dashboard"]))


# ---------------------------------------------------------------------------
# Actions: meal plan changes
# ---------------------------------------------------------------------------
def _plan_meal(plan: Optional[dict], slot: str) -> dict:
    if plan is None:
        raise ToolError("You don't have a meal plan yet.")
    meal = next((m for m in plan["meals"] if m["id"] == slot), None)
    if meal is None:
        raise ToolError(f"Your plan has no {slot.replace('_', ' ')} meal.")
    if slot in (plan.get("logged_today") or []):
        raise ToolError("That meal is already logged for today, so it can't change until tomorrow.")
    return meal


def _items_text(items: List[dict]) -> str:
    return ", ".join(f"{i['quantity']:g} {i['unit']} {i['name']}" for i in items)


class RegenerateArgs(_Args):
    meal: PlanSlot = Field(..., description="Which plan meal to replace")


async def prepare_regenerate(ctx: ToolContext, args: RegenerateArgs) -> Proposal:
    meal = _plan_meal(await diet_plan_service.get_plan(ctx.user_id), args.meal)
    label = args.meal.replace("_", " ")
    return Proposal(
        title=f"New {label} option",
        summary=f"Replaces your planned {label} with a different meal of about the same calories.",
        changes=[Change(label="Now", value=_items_text(meal["items"])),
                 Change(label="Calories now", value=f"{_r(meal['totals']['kcal'])} kcal")],
        payload={"meal": args.meal},
    )


async def execute_regenerate(ctx: ToolContext, payload: Dict[str, Any]) -> ActionResult:
    try:
        plan = await diet_plan_service.regenerate_meal(ctx.user_id, payload["meal"])
    except DietPlanError as e:
        raise ToolError(str(e)) from e
    meal = next(m for m in plan["meals"] if m["id"] == payload["meal"])
    return ActionResult(
        message=(f"New {payload['meal'].replace('_', ' ')}: {_items_text(meal['items'])}. "
                 f"{_r(meal['totals']['kcal'])} kcal, {_r(meal['totals']['protein'])} g protein."),
        data={"meal": meal},
    )


register(Tool("regenerate_plan_meal", "Replace one meal of the meal plan with a new option.", "action",
              args=RegenerateArgs, prepare=prepare_regenerate, execute=execute_regenerate,
              invalidates=["dietPlan"]))


class SwapArgs(_Args):
    meal: PlanSlot = Field(..., description="Plan meal containing the food")
    food: str = Field(..., min_length=2, max_length=80, description="Food in that meal to replace")
    replacement: Optional[str] = Field(None, max_length=80, description="What to swap in, if the user said")


async def prepare_swap(ctx: ToolContext, args: SwapArgs) -> Proposal:
    from app.nutrition.food_db import name_score

    meal = _plan_meal(await diet_plan_service.get_plan(ctx.user_id), args.meal)
    scored = [(name_score(args.food, i["name"]), idx) for idx, i in enumerate(meal["items"])]
    best_score, index = max(scored) if scored else (0, -1)
    if index < 0 or best_score < 0.3:
        raise ToolError(f"Couldn't find {args.food} in your {args.meal.replace('_', ' ')}. "
                        f"It has: {_items_text(meal['items'])}.")
    try:
        options = await diet_plan_service.swap_options(ctx.user_id, args.meal, index, args.replacement)
    except DietPlanError as e:
        raise ToolError(str(e)) from e
    if not options:
        raise ToolError("No allowed food matches that swap. Try a different food.")
    current, new = meal["items"][index], options[0]
    return Proposal(
        title="Swap a food in your plan",
        summary=f"Swaps {current['name']} for {new['name']} in your {args.meal.replace('_', ' ')}.",
        changes=[
            Change(label="Out", value=f"{current['quantity']:g} {current['unit']} {current['name']}, "
                                      f"{_r(current['nutrients']['kcal'])} kcal"),
            Change(label="In", value=f"{new['quantity']:g} {new['unit']} {new['name']}, "
                                     f"{_r(new['nutrients']['kcal'])} kcal, {_r(new['nutrients']['protein'])} g protein"),
        ],
        payload={"meal": args.meal, "index": index, "food_id": new["food_id"]},
    )


async def execute_swap(ctx: ToolContext, payload: Dict[str, Any]) -> ActionResult:
    try:
        plan = await diet_plan_service.swap_item(ctx.user_id, payload["meal"], payload["index"], payload["food_id"])
    except DietPlanError as e:
        raise ToolError(str(e)) from e
    meal = next(m for m in plan["meals"] if m["id"] == payload["meal"])
    item = meal["items"][payload["index"]]
    return ActionResult(
        message=(f"Swapped in {item['quantity']:g} {item['unit']} {item['name']}. "
                 f"Your {payload['meal'].replace('_', ' ')} is now {_r(meal['totals']['kcal'])} kcal."),
        data={"meal": meal},
    )


register(Tool("swap_plan_food", "Swap one food in a meal plan meal for another.", "action",
              args=SwapArgs, prepare=prepare_swap, execute=execute_swap, invalidates=["dietPlan"]))


# ---------------------------------------------------------------------------
# Action: quick workout
# ---------------------------------------------------------------------------
class QuickWorkoutArgs(_Args):
    minutes: Literal[10, 15, 20] = Field(..., description="10, 15 or 20 minutes")
    place: Literal["home", "gym"] = "home"


async def prepare_quick(ctx: ToolContext, args: QuickWorkoutArgs) -> Proposal:
    return Proposal(
        title="Start a quick session",
        summary=f"Replaces today's workout with a {args.minutes}-minute {args.place} session.",
        changes=[Change(label="Length", value=f"{args.minutes} min"),
                 Change(label="Where", value=args.place)],
        payload={"minutes": args.minutes, "place": args.place},
    )


async def execute_quick(ctx: ToolContext, payload: Dict[str, Any]) -> ActionResult:
    today = await workout_service.start_quick_session(await _user(ctx), payload["minutes"], payload["place"])
    names = ", ".join(e.get("name", "") for e in today.get("exercises", [])[:6])
    return ActionResult(
        message=f"Today's session is now {payload['minutes']} minutes: {names}.",
        data={"today": today},
    )


register(Tool("start_quick_workout", "Swap today's workout for a short 10, 15 or 20 minute session.",
              "action", args=QuickWorkoutArgs, prepare=prepare_quick, execute=execute_quick,
              invalidates=["workouts", "dashboard"]))


# ---------------------------------------------------------------------------
# Action: log recovery
# ---------------------------------------------------------------------------
class RecoveryArgs(_Args):
    sleep_hours: float = Field(..., ge=0, le=24)
    sleep_quality: int = Field(..., ge=1, le=5, description="1 poor to 5 great")
    stress_level: int = Field(..., ge=1, le=5, description="1 low to 5 high")
    muscle_soreness: int = Field(..., ge=1, le=5, description="1 none to 5 very sore")


async def prepare_recovery(ctx: ToolContext, args: RecoveryArgs) -> Proposal:
    score = recovery_service.calculate_recovery_score(
        args.sleep_hours, args.sleep_quality, args.stress_level, args.muscle_soreness
    )
    return Proposal(
        title="Log recovery check-in",
        summary=f"Records today's check-in. Recovery score: {score}/100.",
        changes=[Change(label="Sleep", value=f"{args.sleep_hours:g} h, quality {args.sleep_quality}/5"),
                 Change(label="Stress", value=f"{args.stress_level}/5"),
                 Change(label="Soreness", value=f"{args.muscle_soreness}/5"),
                 Change(label="Score", value=f"{score}/100")],
        payload=args.model_dump(),
    )


async def execute_recovery(ctx: ToolContext, payload: Dict[str, Any]) -> ActionResult:
    log = await recovery_service.log_recovery(ctx.user_id, payload)
    await gamification_service.award_action_xp(ctx.user_id, "recovery")
    return ActionResult(
        message=f"Recovery logged: {log.score}/100. {recovery_service.get_recommendation(log.score)}",
        data={"recovery_score": log.score},
    )


register(Tool("log_recovery", "Log today's sleep, stress and soreness check-in.", "action",
              args=RecoveryArgs, prepare=prepare_recovery, execute=execute_recovery,
              invalidates=["recovery", "workouts", "dashboard", "gamification"]))
