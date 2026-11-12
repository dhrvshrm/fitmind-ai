"""Daily steps, step targets, desk routines and work-hours break reminders.

Steps are entered by hand for now. Automatic sync needs Google Health
Connect, an on-device Android API, so it will come with a native wrapper
(for example Capacitor) in a later step; the ``source`` field on each entry
is there for that.

When at least 7 of the last 14 days have steps, the activity level behind
the calorie targets follows the steps (see ``app/activity/steps.py`` for the
banding and the one-band limits); otherwise the self-reported level is used.
"""
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

from app.activity import breaks, desk_routines
from app.activity import steps as step_rules
from app.models import activity as activity_model
from app.models.user import User
from app.nutrition.targets import canonical_goal
from app.services import user_service
from app.utils.time import DEFAULT_TIMEZONE, local_today

logger = logging.getLogger(__name__)

# How far back steps can be entered or edited.
MAX_BACKFILL_DAYS = 30
DEFAULT_HISTORY_DAYS = 14
MAX_HISTORY_DAYS = 90

DEFAULT_SETTINGS: Dict[str, Any] = {
    "step_target": None,
    "break_reminders_enabled": False,
    "work_start": "09:00",
    "work_end": "18:00",
    "break_interval_minutes": 60,
    "work_days": [0, 1, 2, 3, 4],
}
SETTING_FIELDS = tuple(DEFAULT_SETTINGS)


class ActivityServiceError(Exception):
    """Raised for invalid activity requests (e.g. a date out of range)."""


# ---------------------------------------------------------------------------
# Settings and step target
# ---------------------------------------------------------------------------
def default_step_target(user: User) -> int:
    return step_rules.default_step_target(
        user.activity_level, canonical_goal(user.fitness_goal), user.age
    )


async def get_settings(user: User) -> Dict[str, Any]:
    """The user's activity settings with defaults filled in, plus the step target in use."""
    stored = await activity_model.get_settings(user.id) or {}
    settings = {field: stored.get(field, DEFAULT_SETTINGS[field]) for field in SETTING_FIELDS}
    default_target = default_step_target(user)
    settings["default_step_target"] = default_target
    settings["effective_step_target"] = settings["step_target"] or default_target
    return settings


async def update_settings(user: User, data: Dict[str, Any]) -> Dict[str, Any]:
    """Apply a partial settings update and return the full settings."""
    fields = {k: v for k, v in data.items() if k in SETTING_FIELDS and v is not None}
    if data.get("reset_step_target"):
        fields["step_target"] = None
    if fields.get("work_start") and fields.get("work_end") and fields["work_start"] == fields["work_end"]:
        raise ActivityServiceError("Work start and end can't be the same time")
    if fields:
        await activity_model.save_settings(user.id, fields)
    return await get_settings(user)


# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------
def _check_date(day: date) -> str:
    today = local_today()
    if day > today:
        raise ActivityServiceError("Steps can't be logged for a future day")
    if day < today - timedelta(days=MAX_BACKFILL_DAYS):
        raise ActivityServiceError(f"Steps can be logged for up to {MAX_BACKFILL_DAYS} days back")
    return day.isoformat()


async def _recent_counts(user_id: str) -> List[int]:
    today = local_today()
    start = today - timedelta(days=step_rules.RECENT_WINDOW_DAYS - 1)
    entries = await activity_model.list_steps(user_id, start.isoformat(), today.isoformat())
    return [e["steps"] for e in entries]


async def refresh_activity_level(user: User) -> Optional[str]:
    """Re-derive the step-based activity level and recompute targets if it changed.

    Returns the step-based level now stored (None when steps aren't used).
    """
    counts = await _recent_counts(user.id)
    previous = getattr(user, "step_activity_level", None)
    level = step_rules.derive_level(counts, user.activity_level, previous)
    if level != previous:
        user.step_activity_level = level
        # Same recompute the profile endpoints use; calorie floors still apply.
        derived = user_service._derived_updates(user)
        await user.update({"step_activity_level": level, **derived})
        logger.info("Step-based activity level for %s: %s -> %s", user.id, previous, level)
    return level


async def log_steps(user: User, day: date, steps: int) -> Dict[str, Any]:
    """Set the steps for one day, then refresh the activity estimate."""
    local_date = _check_date(day)
    entry = await activity_model.upsert_steps(user.id, local_date, steps)
    await refresh_activity_level(user)
    return {"date": local_date, "steps": entry["steps"], "source": entry["source"]}


async def delete_steps(user: User, day: date) -> None:
    local_date = _check_date(day)
    if not await activity_model.delete_steps(user.id, local_date):
        raise ActivityServiceError("No steps logged for that day")
    await refresh_activity_level(user)


def activity_estimate(user: User, recent: List[int]) -> Dict[str, Any]:
    """Which activity level the targets use and why."""
    step_level = getattr(user, "step_activity_level", None)
    effective = step_rules.effective_level(user.activity_level, step_level)
    average = round(sum(recent) / len(recent)) if recent else None
    return {
        "self_reported": user.activity_level,
        "step_level": step_level,
        "effective": effective,
        "source": "steps" if step_level else "self_reported",
        "recent_days_logged": len(recent),
        "recent_average": average,
        "days_needed": step_rules.MIN_DAYS_FOR_ESTIMATE,
        "window_days": step_rules.RECENT_WINDOW_DAYS,
    }


async def steps_summary(user: User, days: int = DEFAULT_HISTORY_DAYS) -> Dict[str, Any]:
    """The last ``days`` days (oldest first, missing days as null), target and estimate."""
    days = max(1, min(days, MAX_HISTORY_DAYS))
    today = local_today()
    start = today - timedelta(days=days - 1)
    entries = await activity_model.list_steps(user.id, start.isoformat(), today.isoformat())
    by_date = {e["local_date"]: e["steps"] for e in entries}
    series = []
    for offset in range(days):
        day = (start + timedelta(days=offset)).isoformat()
        series.append({"date": day, "steps": by_date.get(day)})
    settings = await get_settings(user)
    target = settings["effective_step_target"]
    logged = [s["steps"] for s in series if s["steps"] is not None]
    last7 = [s["steps"] for s in series[-7:] if s["steps"] is not None]
    recent = await _recent_counts(user.id)
    return {
        "today": today.isoformat(),
        "today_steps": by_date.get(today.isoformat()),
        "target": target,
        "target_is_default": settings["step_target"] is None,
        "days": series,
        "average_7d": round(sum(last7) / len(last7)) if last7 else None,
        "days_on_target": sum(1 for s in logged if s >= target),
        "max_backfill_days": MAX_BACKFILL_DAYS,
        "activity": activity_estimate(user, recent),
    }


# ---------------------------------------------------------------------------
# Desk routines
# ---------------------------------------------------------------------------
def list_routines(user: User) -> List[dict]:
    return desk_routines.list_routines(user.injuries)


def get_routine(user: User, routine_id: str) -> dict:
    routine = desk_routines.get_routine(routine_id, user.injuries)
    if routine is None:
        raise ActivityServiceError("Routine not found")
    return routine


# ---------------------------------------------------------------------------
# Break reminders
# ---------------------------------------------------------------------------
BREAK_TITLE = "Time for a short break"
BREAK_BODY = "Stand up, move for {minutes} minutes, and have some water. Try: {routine}."


def _user_fields(user: Union[User, Dict[str, Any]]) -> tuple:
    if isinstance(user, dict):
        return user["id"], user.get("timezone") or DEFAULT_TIMEZONE
    return user.id, getattr(user, "timezone", None) or DEFAULT_TIMEZONE


async def due_break_reminders(user: Union[User, Dict[str, Any]], now: datetime) -> List[dict]:
    """Break reminders due for ``user`` at ``now`` (an aware datetime), for the push sender.

    Returns an empty list or one reminder. Each has a ``key`` that is unique
    per slot; call :func:`mark_break_reminder_sent` with it after sending so
    the same slot isn't sent twice. Slots more than 20 minutes old are skipped.
    """
    user_id, tz = _user_fields(user)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    stored = await activity_model.get_settings(user_id) or {}
    settings = {field: stored.get(field, DEFAULT_SETTINGS[field]) for field in SETTING_FIELDS}
    if not settings["break_reminders_enabled"]:
        return []
    slot = breaks.latest_slot(
        now, tz, settings["work_start"], settings["work_end"],
        settings["break_interval_minutes"], settings["work_days"],
    )
    if slot is None or now - slot > breaks.MAX_LATENESS:
        return []
    key = f"break:{slot.date().isoformat()}:{slot.strftime('%H:%M')}"
    if stored.get("last_break_key") == key:
        return []
    index = breaks.slot_index(slot, settings["work_start"], settings["break_interval_minutes"])
    routine = desk_routines.routine_for_slot(index - 1)
    return [{
        "type": "break_reminder",
        "key": key,
        "title": BREAK_TITLE,
        "body": BREAK_BODY.format(minutes=routine["minutes"], routine=routine["name"].lower()),
        "routine_id": routine["id"],
        "slot_at": slot.isoformat(),
        "url": f"/activity?routine={routine['id']}",
    }]


async def mark_break_reminder_sent(user_id: str, key: str) -> None:
    """Record that the reminder with ``key`` was delivered."""
    await activity_model.save_settings(user_id, {"last_break_key": key})
