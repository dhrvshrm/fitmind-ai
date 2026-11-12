"""Push reminders for meals, the workout and water, plus one comeback after missed days.

Runs every 15 minutes (the APScheduler job, and an external cron ping because
free hosting sleeps). For each person with reminders on, in their own
timezone, it works out which reminders are due now and sends each one at most
once per local day. After two or more full days with nothing logged, the
daily reminders pause and a single friendly "start again" push goes out
instead; logging anything resumes the normal reminders.
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from app.models import diet_plan
from app.models import push as push_store
from app.models.nutrition import Meal, get_water
from app.models.user import User
from app.models.workout import WorkoutLog
from app.nutrition import routine
from app.services import analytics_service, habit_service, push_service, workout_service
from app.utils.time import local_now, use_timezone

logger = logging.getLogger(__name__)

# A reminder is still sent if the run comes up to this many minutes after its time
# (covers a sleeping server woken by the external cron), never later.
DUE_WINDOW_MINUTES = 60
WORKOUT_LEAD_MINUTES = 15
DEFAULT_WORKOUT_TIME = "18:00"
DEFAULT_WATER_TIME = "15:00"
DEFAULT_WATER_GOAL_ML = 2500
# The comeback push goes out during the day, never early morning or late night.
COMEBACK_START = "10:00"
COMEBACK_END = "20:00"

KIND_MEALS = "meals"
KIND_WORKOUT = "workout"
KIND_WATER = "water"
KIND_COMEBACK = "comeback"

DEFAULT_SETTINGS: Dict[str, Any] = {
    "enabled": True,
    KIND_MEALS: True,
    KIND_WORKOUT: True,
    KIND_WATER: True,
    KIND_COMEBACK: True,
    # "HH:MM", or None to follow the workout time from onboarding.
    "workout_time": None,
    "water_time": DEFAULT_WATER_TIME,
}
TOGGLES = ("enabled", KIND_MEALS, KIND_WORKOUT, KIND_WATER, KIND_COMEBACK)

# Plan slot ids to the words used in a notification.
SLOT_LABELS = {
    "breakfast": "breakfast",
    "mid_morning": "mid-morning snack",
    "lunch": "lunch",
    "evening_snack": "evening snack",
    "dinner": "dinner",
    "bedtime": "bedtime snack",
    "pre_workout": "pre-workout snack",
}
MAIN_MEAL_TYPES = {"breakfast", "lunch", "dinner"}

ROUTE_TODAY = "/today"
ROUTE_WORKOUTS = "/workouts"


class ReminderError(Exception):
    """Invalid reminder settings."""


def _minutes(hhmm: str) -> int:
    return routine.minutes(hhmm)


def _valid_time(value: Optional[str]) -> bool:
    if not isinstance(value, str) or len(value) != 5 or value[2] != ":":
        return False
    try:
        hours, mins = int(value[:2]), int(value[3:])
    except ValueError:
        return False
    return 0 <= hours < 24 and 0 <= mins < 60


def is_due(time_hhmm: str, now: datetime, window: int = DUE_WINDOW_MINUTES) -> bool:
    """True if ``now`` (local) is at or up to ``window`` minutes after ``time_hhmm``."""
    if not _valid_time(time_hhmm):
        return False
    elapsed = now.hour * 60 + now.minute - _minutes(time_hhmm)
    return 0 <= elapsed < window


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
async def get_settings(user_id: str) -> Dict[str, Any]:
    stored = await push_store.get_settings(user_id) or {}
    return {key: stored.get(key, default) for key, default in DEFAULT_SETTINGS.items()}


async def update_settings(user_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
    """Change some reminder settings; unknown keys are ignored.

    Raises:
        ReminderError: if a time isn't a valid ``HH:MM``.
    """
    current = await get_settings(user_id)
    for key in TOGGLES:
        if changes.get(key) is not None:
            current[key] = bool(changes[key])
    if "workout_time" in changes:
        value = changes["workout_time"] or None
        if value is not None and not _valid_time(value):
            raise ReminderError("Please pick a valid workout time")
        current["workout_time"] = value
    if changes.get("water_time") is not None:
        if not _valid_time(changes["water_time"]):
            raise ReminderError("Please pick a valid time for the water reminder")
        current["water_time"] = changes["water_time"]
    await push_store.save_settings(user_id, current)
    return current


def workout_reminder_time(settings: Dict[str, Any], workout_time: Optional[str]) -> str:
    """When to remind about the workout: the chosen time, or a little before the usual start."""
    if settings.get("workout_time"):
        return settings["workout_time"]
    start = routine.WORKOUT_START.get(workout_time or "")
    if not start:
        return DEFAULT_WORKOUT_TIME
    return routine.hhmm(_minutes(start) - WORKOUT_LEAD_MINUTES)


# ---------------------------------------------------------------------------
# What's due (pure, so it can be tested without a database)
# ---------------------------------------------------------------------------
def due_reminders(
    now: datetime,
    settings: Dict[str, Any],
    plan_meals: List[dict],
    logged_meal_ids: Set[str],
    logged_meal_types: Set[str],
    workout: Dict[str, Any],
    water: Dict[str, int],
) -> List[Dict[str, str]]:
    """Reminders due at local time ``now``. Each has a ``key`` used for daily dedupe.

    ``workout`` is ``{"time": "HH:MM", "planned": bool, "done": bool}``;
    ``water`` is ``{"ml": today's total, "goal_ml": daily goal}``.
    """
    if not settings.get("enabled", True):
        return []
    due: List[Dict[str, str]] = []
    if settings.get(KIND_MEALS, True):
        for meal in plan_meals:
            if meal["id"] in logged_meal_ids or meal.get("meal_type") in (logged_meal_types & MAIN_MEAL_TYPES):
                continue
            if not is_due(meal.get("time", ""), now):
                continue
            label = SLOT_LABELS.get(meal["id"], meal.get("meal_type", "meal"))
            dishes = ", ".join(i["name"] for i in meal.get("items", [])[:3])
            due.append({
                "key": f"meal:{meal['id']}",
                "title": f"Time for {label}",
                "body": f"{dishes}. Tap to log it in one go." if dishes else "Tap to log it in one go.",
                "url": ROUTE_TODAY,
                "tag": f"meal-{meal['id']}",
            })
    if settings.get(KIND_WORKOUT, True) and workout.get("planned") and not workout.get("done"):
        if is_due(workout.get("time", ""), now):
            due.append({
                "key": "workout",
                "title": "Your workout is coming up",
                "body": "Short on time? A 15-minute session still counts.",
                "url": ROUTE_TODAY,
                "tag": "workout",
            })
    if settings.get(KIND_WATER, True) and water.get("ml", 0) < water.get("goal_ml", DEFAULT_WATER_GOAL_ML):
        if is_due(settings.get("water_time") or DEFAULT_WATER_TIME, now):
            due.append({
                "key": "water",
                "title": "Time for some water",
                "body": "A glass now keeps you on track. One tap to add it.",
                "url": ROUTE_TODAY,
                "tag": "water",
            })
    return due


def comeback_due(now: datetime, settings: Dict[str, Any], missed_days: int) -> bool:
    """Whether the single "start again" push may go out now."""
    if not settings.get("enabled", True) or not settings.get(KIND_COMEBACK, True):
        return False
    if missed_days < habit_service.RESTART_AFTER_MISSED_DAYS:
        return False
    minute = now.hour * 60 + now.minute
    return _minutes(COMEBACK_START) <= minute < _minutes(COMEBACK_END)


COMEBACK_MESSAGE = {
    "key": "comeback",
    "title": "Pick up where you left off",
    "body": "No catching up needed. Log one meal today and you're back on track.",
    "url": ROUTE_TODAY,
    "tag": "comeback",
}


# ---------------------------------------------------------------------------
# Running
# ---------------------------------------------------------------------------
async def _send(user_id: str, reminder: Dict[str, str], dedupe_date: str) -> bool:
    if not await push_store.claim_send(user_id, reminder["key"], dedupe_date):
        return False
    delivered = await push_service.send_push(
        user_id, reminder["title"], reminder["body"], reminder["url"], reminder["tag"]
    )
    if delivered:
        await analytics_service.track(
            user_id, analytics_service.REMINDER_SENT, {"kind": reminder["key"].split(":")[0]}
        )
    return delivered > 0


async def _workout_state(user: User, settings: Dict[str, Any], today: str) -> Dict[str, Any]:
    session = await workout_service.get_today_workout(user)
    planned = bool(session.get("exercises")) and session.get("workout_type") != "rest"
    done = any(log.log_date == today for log in await WorkoutLog.get_history(user.id, days=3))
    return {
        "time": workout_reminder_time(settings, getattr(user, "workout_time", None)),
        "planned": planned,
        "done": done,
    }


async def run_for_user(user: User, now: Optional[datetime] = None) -> int:
    """Send whatever is due for one user (in their timezone). Returns how many were sent."""
    with use_timezone(user.timezone):
        now = now or local_now()
        today = now.date().isoformat()
        settings = await get_settings(user.id)
        if not settings["enabled"]:
            return 0

        restart = await habit_service.restart_status(user)
        if restart["show"]:
            # Missed a few days: no daily reminders, one gentle comeback per break.
            if comeback_due(now, settings, restart["missed_days"]):
                lapse = restart["last_log_date"] or "never"
                return int(await _send(user.id, COMEBACK_MESSAGE, f"since:{lapse}"))
            return 0

        plan = await diet_plan.get_active(user.id) or {}
        meals_today = await Meal.get_by_date(user.id, today)
        targets = getattr(user, "targets", None) or {}
        due = due_reminders(
            now,
            settings,
            plan.get("meals", []),
            set(plan.get("logged", {}).get(today, [])),
            {m.meal_type for m in meals_today if m.meal_type},
            await _workout_state(user, settings, today),
            {"ml": await get_water(user.id, today), "goal_ml": targets.get("water_ml") or DEFAULT_WATER_GOAL_ML},
        )
        sent = 0
        for reminder in due:
            sent += int(await _send(user.id, reminder, today))
        return sent


async def run_due_reminders() -> Dict[str, int]:
    """One pass over everyone with reminders on. Safe to call often and concurrently."""
    if not push_service.is_enabled():
        return {"users": 0, "sent": 0}
    users = sent = 0
    for user_id in await push_store.subscribed_user_ids():
        user = await User.get_by_id(user_id)
        if user is None:
            continue
        users += 1
        try:
            sent += await run_for_user(user)
        except Exception as e:  # One person's bad data must not stop the rest.
            logger.warning("Reminders failed for %s: %s", user_id, e)
    logger.info("Reminders: checked %d user(s), sent %d", users, sent)
    return {"users": users, "sent": sent}

