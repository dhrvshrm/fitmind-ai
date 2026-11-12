"""Progress: weight and waist trends, adaptive targets, habit patterns,
flexible days and the numbers behind the weekly summary.

The maths lives in ``app.progress``; this module loads the user's logs,
turns them into one record per day, and stores decisions.

Other features should call :func:`effective_target_for` for "today's calorie
target", because a flexible day (or the rebalance after one) changes it.
"""
import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Set, Union
from zoneinfo import ZoneInfo

from app.models import progress as store
from app.models.nutrition import Meal, get_water
from app.models.user import User
from app.models.weight import WeightLog
from app.models.workout import WorkoutLog, WorkoutPlan
from app.nutrition.targets import CALORIE_FLOOR, FAT_MIN_PER_KG, FAT_SHARE, FIBER_PER_1000_KCAL, KCAL_PER_G
from app.progress import adaptive, flex, patterns, trend
from app.services import user_service
from app.utils.time import get_current_timezone, local_today

logger = logging.getLogger(__name__)

TREND_DAYS = 90
MAX_BACKFILL_DAYS = 7
FLEX_MAX_DAYS_AHEAD = 60
WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class ProgressServiceError(Exception):
    """A request that can't be done; ``status`` is the HTTP status to return."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------
def _iso(day: Union[date, str]) -> str:
    return day if isinstance(day, str) else day.isoformat()


def _as_date(day: Union[date, str]) -> date:
    return date.fromisoformat(day) if isinstance(day, str) else day


def floor_for(user: User) -> int:
    """The user's calorie floor (never prescribe below it)."""
    sex = (user.gender or "other").lower()
    return CALORIE_FLOOR.get(sex, CALORIE_FLOOR["other"])


def no_deficit(targets: Dict[str, Any]) -> bool:
    """True where the targets rule out eating below maintenance (minors, pregnancy)."""
    return any(f in (targets.get("flags") or []) for f in adaptive.NO_DEFICIT_FLAGS)


def _resolve_backfill(log_date: Optional[date]) -> str:
    today = local_today()
    if log_date is None:
        return today.isoformat()
    if log_date > today or log_date < today - timedelta(days=MAX_BACKFILL_DAYS):
        raise ProgressServiceError(f"You can log for today or up to {MAX_BACKFILL_DAYS} days back")
    return log_date.isoformat()


def _meal_time(meal: Meal) -> Optional[str]:
    """Local "HH:MM" the meal was eaten, when it's known or can be inferred."""
    if meal.eaten_at:
        return meal.eaten_at
    created = meal.created_at
    if created is None or created.tzinfo is None:
        return None
    local = created.astimezone(ZoneInfo(get_current_timezone()))
    # Only trust the logging time for meals logged on the day they were eaten.
    if local.date().isoformat() != meal.log_date:
        return None
    return local.strftime("%H:%M")


async def day_records(user_id: str, start: str, end: str, with_water: bool = True) -> List[dict]:
    """One record per date in [start, end] with the day's nutrition, water and workouts."""
    first, last = date.fromisoformat(start), date.fromisoformat(end)
    dates = [(first + timedelta(days=i)).isoformat() for i in range((last - first).days + 1)]
    days = {
        d: {"date": d, "meal_count": 0, "meal_types": set(), "meal_times": [], "calories": 0.0,
            "protein": 0.0, "water_ml": 0, "workouts": 0, "flexible": False}
        for d in dates
    }
    for meal in await Meal.get_since(user_id, start):
        day = days.get(meal.log_date)
        if day is None:
            continue
        day["meal_count"] += 1
        day["calories"] += meal.calories or 0
        day["protein"] += meal.protein or 0
        if meal.meal_type:
            day["meal_types"].add(meal.meal_type)
        time = _meal_time(meal)
        if time:
            day["meal_times"].append(time)
    for log in await WorkoutLog.get_history(user_id, days=500):
        if log.log_date in days:
            days[log.log_date]["workouts"] += 1
    for entry in await store.list_flex_days(user_id, start, end):
        if entry["date"] in days:
            days[entry["date"]]["flexible"] = True
    if with_water:
        for d in dates:
            days[d]["water_ml"] = await get_water(user_id, d)
    return [days[d] for d in dates]


async def _planned_weekdays(user_id: str) -> Set[int]:
    plan = await WorkoutPlan.get_latest_for_user(user_id)
    if plan is None:
        return set()
    return {
        WEEKDAY_NAMES.index(entry["day"])
        for entry in plan.week
        if entry.get("day") in WEEKDAY_NAMES and entry.get("workout_type") not in (None, "rest")
    }


async def _weight_readings(user_id: str, days: int = TREND_DAYS) -> List[trend.Reading]:
    since = (local_today() - timedelta(days=days)).isoformat()
    logs = await WeightLog.get_history(user_id, days=days + 30)
    return [(log.log_date, float(log.weight_kg)) for log in logs if log.log_date >= since]


# ---------------------------------------------------------------------------
# Weight and body measurements
# ---------------------------------------------------------------------------
async def get_weight_trend(user_id: str, days: int = TREND_DAYS) -> Dict[str, Any]:
    """Weigh-ins with their smoothed trend, weekly rate and direction."""
    result = trend.summarize(await _weight_readings(user_id, days), "weight")
    return {
        "points": [{"date": p["date"], "weight": p["value"], "trend": p["trend"]} for p in result["points"]],
        "summary": result["summary"],
    }


async def log_weight(user_id: str, weight_kg: float, log_date: Optional[date] = None) -> Dict[str, Any]:
    """Record a weigh-in (one per day; a second one the same day replaces it)."""
    day = _resolve_backfill(log_date)
    await WeightLog(user_id, weight_kg, log_date=day).save()
    return {"date": day, "weight_kg": weight_kg}


async def log_measurement(
    user_id: str, waist_cm: Optional[float], hip_cm: Optional[float], log_date: Optional[date] = None
) -> Dict[str, Any]:
    """Record waist and/or hip for a day."""
    if waist_cm is None and hip_cm is None:
        raise ProgressServiceError("Add a waist or hip measurement")
    day = _resolve_backfill(log_date)
    doc = await store.save_measurement(user_id, day, waist_cm, hip_cm)
    return {"date": day, "waist_cm": doc.get("waist_cm"), "hip_cm": doc.get("hip_cm")}


async def get_measurements(user_id: str, days: int = TREND_DAYS) -> Dict[str, Any]:
    """Waist and hip readings, each with its own smoothed trend."""
    since = (local_today() - timedelta(days=days)).isoformat()
    docs = await store.list_measurements(user_id, since)
    out: Dict[str, Any] = {}
    for field, kind in (("waist_cm", "waist"), ("hip_cm", "hip")):
        readings = [(d["log_date"], float(d[field])) for d in docs if d.get(field) is not None]
        result = trend.summarize(readings, kind)
        out[kind] = {
            "points": [{"date": p["date"], "value": p["value"], "trend": p["trend"]} for p in result["points"]],
            "summary": result["summary"],
        }
    return out


# ---------------------------------------------------------------------------
# Adaptive target
# ---------------------------------------------------------------------------
async def get_adaptive_status(user: User) -> Dict[str, Any]:
    """Whether the logs suggest a different calorie target, and the numbers behind it."""
    targets = await user_service.get_targets(user)
    if not targets:
        return {"status": "no_targets"}
    today = local_today()
    start = (today - timedelta(days=adaptive.WINDOW_DAYS)).isoformat()
    end = (today - timedelta(days=1)).isoformat()
    records = await day_records(user.id, start, end, with_water=False)
    intake = {r["date"]: r["calories"] for r in records if r["meal_count"]}
    weights = await _weight_readings(user.id, adaptive.WINDOW_DAYS + 30)
    decision = await store.latest_target_decision(user.id)
    last = decision.get("local_date") if decision else None
    return adaptive.estimate(
        today=today, intake=intake, weights=weights, targets=targets,
        floor_kcal=floor_for(user), last_decision=last,
    )


def _retarget(targets: Dict[str, Any], calories: int, weight_kg: float, estimated_tdee: int) -> Dict[str, Any]:
    """Targets with a new calorie number; protein stays, fat and carbs follow the usual rules."""
    protein = targets["protein"]
    fat = max(calories * FAT_SHARE / KCAL_PER_G["fat"], FAT_MIN_PER_KG * weight_kg)
    carbs = max((calories - protein * KCAL_PER_G["protein"] - fat * KCAL_PER_G["fat"]) / KCAL_PER_G["carbs"], 0)
    notes = [n for n in targets.get("notes", []) if n.get("code") != "adaptive"]
    notes.append({"code": "adaptive", "values": {"kcal": calories, "estimated_tdee": estimated_tdee}})
    flags = [f for f in targets.get("flags", []) if f != "adaptive_target"] + ["adaptive_target"]
    return {
        **targets,
        "calories": calories,
        "fats": round(fat),
        "carbs": round(carbs),
        "fiber": round(calories / 1000 * FIBER_PER_1000_KCAL),
        "adjustment_kcal": calories - int(targets.get("tdee") or calories),
        "notes": notes,
        "flags": flags,
    }


async def accept_adaptive_target(user: User, calories: int) -> Dict[str, Any]:
    """Apply the current suggestion. ``calories`` must match what was shown."""
    status = await get_adaptive_status(user)
    if status.get("status") != "suggestion":
        raise ProgressServiceError("There's no target suggestion right now", 409)
    if int(calories) != status["suggested_target"]:
        raise ProgressServiceError("The suggestion has changed. Please take another look.", 409)
    targets = await user_service.get_targets(user)
    new_targets = _retarget(targets, int(calories), float(user.weight_kg or 70), status["estimated_tdee"])
    await user.update({"targets": new_targets})
    await store.add_target_decision(user.id, {
        "action": "accepted", "local_date": local_today().isoformat(),
        "from_calories": status["current_target"], "to_calories": int(calories),
        "estimated_tdee": status["estimated_tdee"],
    })
    return new_targets


async def dismiss_adaptive_target(user: User) -> Dict[str, Any]:
    """Keep the current target; the next suggestion waits a week."""
    status = await get_adaptive_status(user)
    if status.get("status") != "suggestion":
        raise ProgressServiceError("There's no target suggestion right now", 409)
    await store.add_target_decision(user.id, {
        "action": "dismissed", "local_date": local_today().isoformat(),
        "from_calories": status["current_target"], "to_calories": status["suggested_target"],
        "estimated_tdee": status["estimated_tdee"],
    })
    return {"dismissed": True}


# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------
async def get_patterns(user: User) -> Dict[str, Any]:
    """Habits seen in the last four weeks, each only with enough evidence."""
    targets = await user_service.get_targets(user) or {}
    today = local_today()
    start = (today - timedelta(days=patterns.WINDOW_DAYS)).isoformat()
    end = (today - timedelta(days=1)).isoformat()
    records = await day_records(user.id, start, end)
    found = patterns.detect(records, targets, await _planned_weekdays(user.id))
    logged = sum(1 for r in records if r["meal_count"] >= patterns.MIN_MEALS_FOR_LOGGED_DAY)
    return {"window_days": patterns.WINDOW_DAYS, "logged_days": logged, "patterns": found}


# ---------------------------------------------------------------------------
# Flexible days and the effective daily target
# ---------------------------------------------------------------------------
async def _week_plan(user: User, targets: Dict[str, Any], start: date) -> Dict[str, dict]:
    dates = flex.week_dates(start)
    flex_days = await store.list_flex_days(user.id, dates[0], dates[-1])
    return flex.plan_week(start, int(targets["calories"]), floor_for(user), flex_days, no_deficit(targets))


def _with_calories(targets: Dict[str, Any], entry: dict) -> Dict[str, Any]:
    delta = entry["calories"] - int(targets["calories"])
    return {
        "date": entry["date"],
        "calories": entry["calories"],
        "base_calories": int(targets["calories"]),
        "adjustment": delta,
        "protein": targets["protein"],
        # Carbs take the change; protein and fat stay as planned.
        "carbs": max(round(targets["carbs"] + delta / KCAL_PER_G["carbs"]), 0),
        "fats": targets["fats"],
        "fiber": targets.get("fiber"),
        "water_ml": targets.get("water_ml"),
        "flexible": entry["flexible"],
        "reason": entry["reason"],
    }


async def effective_target_for(user: User, day: Union[date, str]) -> Optional[Dict[str, Any]]:
    """The user's targets for ``day``, after flexible days and their rebalance.

    Returns None until the profile has enough to compute targets. Use this
    instead of ``user.targets`` wherever a specific day's target is shown.
    """
    targets = await user_service.get_targets(user)
    if not targets:
        return None
    day = _as_date(day)
    plan = await _week_plan(user, targets, flex.week_start(day))
    return _with_calories(targets, plan[day.isoformat()])


async def get_flexible_week(user: User, week_of: Optional[date] = None) -> Dict[str, Any]:
    """Daily targets for a Monday-Sunday week plus its flexible days."""
    targets = await user_service.get_targets(user)
    start = flex.week_start(week_of or local_today())
    dates = flex.week_dates(start)
    flex_days = await store.list_flex_days(user.id, dates[0], dates[-1])
    days: List[dict] = []
    if targets:
        plan = await _week_plan(user, targets, start)
        days = [_with_calories(targets, plan[d]) for d in dates]
    return {
        "week_start": dates[0],
        "week_end": dates[-1],
        "days": days,
        "flexible_days": [_public_flex(f) for f in flex_days],
        "limits": {
            "max_per_week": flex.MAX_FLEX_DAYS_PER_WEEK,
            "default_extra_kcal": flex.DEFAULT_EXTRA_KCAL,
            "min_extra_kcal": flex.MIN_EXTRA_KCAL,
            "max_extra_kcal": flex.MAX_EXTRA_KCAL,
            "reasons": list(flex.REASONS),
        },
    }


def _public_flex(doc: dict) -> dict:
    return {k: doc.get(k) for k in ("date", "reason", "extra_kcal", "marked_on", "note")}


async def mark_flexible_day(
    user: User, day: date, reason: str, extra_kcal: Optional[int] = None, note: Optional[str] = None
) -> Dict[str, Any]:
    """Mark a day as flexible. Allowed from this week's Monday up to 60 days ahead."""
    today = local_today()
    if day < flex.week_start(today) or day > today + timedelta(days=FLEX_MAX_DAYS_AHEAD):
        raise ProgressServiceError("Pick a day in this week or the next two months")
    if reason not in flex.REASONS:
        raise ProgressServiceError("Unknown reason")
    extra = flex.DEFAULT_EXTRA_KCAL if extra_kcal is None else int(extra_kcal)
    if not flex.MIN_EXTRA_KCAL <= extra <= flex.MAX_EXTRA_KCAL:
        raise ProgressServiceError(
            f"Extra calories should be between {flex.MIN_EXTRA_KCAL} and {flex.MAX_EXTRA_KCAL}"
        )
    dates = flex.week_dates(flex.week_start(day))
    existing = await store.list_flex_days(user.id, dates[0], dates[-1])
    others = [f for f in existing if f["date"] != day.isoformat()]
    if len(others) >= flex.MAX_FLEX_DAYS_PER_WEEK:
        raise ProgressServiceError(f"You can have up to {flex.MAX_FLEX_DAYS_PER_WEEK} flexible days a week")
    previous = next((f for f in existing if f["date"] == day.isoformat()), None)
    # Re-marking keeps the original "marked on" so the rebalance doesn't shift.
    marked_on = previous["marked_on"] if previous else today.isoformat()
    doc = await store.save_flex_day(user.id, day.isoformat(), reason, extra, marked_on, note)
    return _public_flex(doc)


async def unmark_flexible_day(user: User, day: date) -> None:
    if not await store.delete_flex_day(user.id, day.isoformat()):
        raise ProgressServiceError("That day isn't marked as flexible", 404)


# ---------------------------------------------------------------------------
# Week summary (the numbers behind the share card and weekly insight)
# ---------------------------------------------------------------------------
async def week_stats(user: User, start: date, end: date) -> Dict[str, Any]:
    """Computed numbers for the days [start, end]. No AI involved."""
    targets = await user_service.get_targets(user) or {}
    records = await day_records(user.id, start.isoformat(), end.isoformat())
    n = len(records)
    logged = [r for r in records if r["meal_count"]]
    full = [r for r in records if r["meal_count"] >= patterns.MIN_MEALS_FOR_LOGGED_DAY]
    protein_target = targets.get("protein") or 0
    water_target = targets.get("water_ml") or 0
    weights = await _weight_readings(user.id, TREND_DAYS)
    weight_summary = trend.summarize([w for w in weights if w[0] <= end.isoformat()], "weight")["summary"]
    measurement_dates = {
        d["log_date"] for d in await store.list_measurements(user.id, start.isoformat())
        if d["log_date"] <= end.isoformat()
    }
    active_dates = {r["date"] for r in records if r["meal_count"] or r["workouts"] or r["water_ml"]}
    active_dates |= {d for d, _ in weights if start.isoformat() <= d <= end.isoformat()}
    active_dates |= measurement_dates
    planned = len(await _planned_weekdays(user.id))
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "days": n,
        "active_days": len(active_dates),
        "meal_days": len(logged),
        "meals_logged": sum(r["meal_count"] for r in records),
        "average_calories": round(sum(r["calories"] for r in full) / len(full)) if full else None,
        "calorie_target": targets.get("calories"),
        "protein_days": sum(1 for r in full if protein_target and r["protein"] >= 0.9 * protein_target),
        "average_protein": round(sum(r["protein"] for r in full) / len(full)) if full else None,
        "protein_target": protein_target or None,
        "workouts_done": sum(1 for r in records if r["workouts"]),
        "workouts_planned": planned,
        "water_days": sum(1 for r in records if water_target and r["water_ml"] >= water_target),
        "flexible_days": sum(1 for r in records if r["flexible"]),
        "weight_trend": weight_summary["current_trend"],
        "weight_weekly_rate": weight_summary["weekly_rate"],
        "weight_direction": weight_summary["direction"],
        "streak": user.current_streak,
        "goal": targets.get("goal") or user.fitness_goal,
    }


async def get_week_summary(user: User) -> Dict[str, Any]:
    """The last seven days, today included, for the shareable summary card."""
    today = local_today()
    return await week_stats(user, today - timedelta(days=6), today)

