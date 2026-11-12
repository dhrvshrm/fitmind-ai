"""Product analytics: which actions people take, to see if the app helps them build a habit.

Only allowlisted event names are recorded, with a few allowlisted, harmless
properties (where an action came from, which screen). Health values, food
names and personal details are never accepted, so they can't leak by accident.

Events are stored in ``analytics_events``. When ``POSTHOG_API_KEY`` is set they
are also sent to PostHog in the background; that never delays or fails the
request that triggered it.

The three numbers that matter (see ``scripts/metrics.py``):
- activation: share of new users who log a meal on their first day,
- day-7 retention: share still logging a meal on their seventh day,
- weekly active loggers: people who logged a meal or workout in the last 7 days.
"""
import asyncio
import logging
from datetime import date, timedelta
from typing import Any, Dict, Iterable, List, Optional, Set

import httpx

from app.config.settings import get_settings
from app.models import analytics
from app.utils.time import local_today, local_today_iso

logger = logging.getLogger(__name__)

# Events recorded by the server at the point where the action happens.
SIGNED_UP = "signed_up"
ONBOARDING_COMPLETED = "onboarding_completed"
MEAL_LOGGED = "meal_logged"
WATER_LOGGED = "water_logged"
WORKOUT_LOGGED = "workout_logged"
RECOVERY_LOGGED = "recovery_logged"
MEAL_PLAN_CREATED = "meal_plan_created"
WORKOUT_PLAN_CREATED = "workout_plan_created"
QUICK_SESSION_STARTED = "quick_session_started"
PUSH_SUBSCRIBED = "push_subscribed"
PUSH_UNSUBSCRIBED = "push_unsubscribed"
REMINDER_SENT = "reminder_sent"

# Events the app may send itself (things only the browser knows about).
APP_OPENED = "app_opened"
TODAY_VIEWED = "today_viewed"
APP_INSTALLED = "app_installed"
REMINDER_OPENED = "reminder_opened"
RESTART_ACTION = "restart_action"

SERVER_EVENTS: Set[str] = {
    SIGNED_UP, ONBOARDING_COMPLETED, MEAL_LOGGED, WATER_LOGGED, WORKOUT_LOGGED,
    RECOVERY_LOGGED, MEAL_PLAN_CREATED, WORKOUT_PLAN_CREATED, QUICK_SESSION_STARTED,
    PUSH_SUBSCRIBED, PUSH_UNSUBSCRIBED, REMINDER_SENT,
}
CLIENT_EVENTS: Set[str] = {APP_OPENED, TODAY_VIEWED, APP_INSTALLED, REMINDER_OPENED, RESTART_ACTION}
ALLOWED_EVENTS: Set[str] = SERVER_EVENTS | CLIENT_EVENTS

# Properties that describe the action, never the person. Anything else is dropped.
ALLOWED_PROPERTIES: Set[str] = {
    "source", "screen", "kind", "platform", "standalone", "meal_type", "minutes", "status", "trigger",
}
MAX_PROPERTY_LENGTH = 40
MAX_PROPERTY_NUMBER = 1000

# Actions that count as "logging" for retention.
LOGGING_EVENTS = (MEAL_LOGGED, WORKOUT_LOGGED)
POSTHOG_TIMEOUT_SECONDS = 5.0

# Background PostHog sends, kept referenced so they aren't garbage-collected mid-flight.
_pending: Set[asyncio.Task] = set()


class AnalyticsError(Exception):
    """An event that isn't on the allowlist."""


def clean_properties(properties: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Keep only allowlisted keys with short text, true/false or small whole-number values."""
    cleaned: Dict[str, Any] = {}
    for key, value in (properties or {}).items():
        if key not in ALLOWED_PROPERTIES:
            continue
        if isinstance(value, bool):
            cleaned[key] = value
        elif isinstance(value, int) and abs(value) <= MAX_PROPERTY_NUMBER:
            cleaned[key] = value
        elif isinstance(value, str) and value.strip():
            cleaned[key] = value.strip()[:MAX_PROPERTY_LENGTH]
    return cleaned


async def _forward_to_posthog(user_id: str, event: str, properties: dict, timestamp: str) -> None:
    settings = get_settings()
    payload = {
        "api_key": settings.POSTHOG_API_KEY,
        "event": event,
        "distinct_id": user_id,
        "properties": {**properties, "$lib": "fitmind-backend"},
        "timestamp": timestamp,
    }
    try:
        async with httpx.AsyncClient(timeout=POSTHOG_TIMEOUT_SECONDS) as http:
            await http.post(f"{settings.POSTHOG_HOST.rstrip('/')}/capture/", json=payload)
    except Exception as e:  # Analytics must never surface as an error.
        logger.info("PostHog send failed for %s: %s", event, e)


def _schedule_forward(user_id: str, event: str, properties: dict, timestamp: str) -> None:
    if not get_settings().POSTHOG_API_KEY:
        return
    try:
        task = asyncio.get_running_loop().create_task(
            _forward_to_posthog(user_id, event, properties, timestamp)
        )
    except RuntimeError:
        return
    _pending.add(task)
    task.add_done_callback(_pending.discard)


async def track(user_id: Optional[str], event: str, properties: Optional[Dict[str, Any]] = None) -> bool:
    """Record one event for a user. Never raises; returns True if it was stored.

    Call it right after the action succeeds. Unknown event names are ignored
    (and logged) so a typo can't break a request.
    """
    if not user_id or event not in ALLOWED_EVENTS:
        if event not in ALLOWED_EVENTS:
            logger.warning("Ignored analytics event that isn't allowlisted: %s", event)
        return False
    try:
        doc = await analytics.insert(user_id, event, clean_properties(properties), local_today_iso())
        _schedule_forward(user_id, event, doc["properties"], doc["at"].isoformat())
        return True
    except Exception as e:
        logger.warning("Could not record analytics event %s: %s", event, e)
        return False


async def track_client_event(user_id: str, event: str, properties: Optional[Dict[str, Any]] = None) -> None:
    """Record an event sent by the app.

    Raises:
        AnalyticsError: if the app isn't allowed to send this event.
    """
    if event not in CLIENT_EVENTS:
        raise AnalyticsError("Unknown event")
    await track(user_id, event, properties)


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
def _dates_by_user(events: Iterable[dict]) -> Dict[str, Set[str]]:
    out: Dict[str, Set[str]] = {}
    for e in events:
        out.setdefault(e["user_id"], set()).add(e["local_date"])
    return out


def _share(part: int, whole: int) -> Optional[float]:
    return round(part / whole, 3) if whole else None


def compute_metrics(events: List[dict], today: date, cohort_days: int = 30) -> Dict[str, Any]:
    """The three habit numbers from a list of events.

    Day 1 is the local day someone signed up; day 7 is six days later. A user
    only counts toward day-7 retention once their day 7 has fully passed.
    Activation and retention cover people who signed up in the last
    ``cohort_days`` days.
    """
    first_seen: Dict[str, date] = {}
    for e in events:
        if e["event"] == SIGNED_UP:
            day = date.fromisoformat(e["local_date"])
            first_seen[e["user_id"]] = min(day, first_seen.get(e["user_id"], day))
    meal_days = _dates_by_user(e for e in events if e["event"] == MEAL_LOGGED)
    cohort_start = today - timedelta(days=cohort_days)
    cohort = {u: d for u, d in first_seen.items() if d >= cohort_start}

    activated = sum(1 for u, d in cohort.items() if d.isoformat() in meal_days.get(u, set()))
    eligible_d7 = {u: d for u, d in cohort.items() if d + timedelta(days=6) < today}
    retained = sum(
        1 for u, d in eligible_d7.items() if (d + timedelta(days=6)).isoformat() in meal_days.get(u, set())
    )
    week_start = (today - timedelta(days=6)).isoformat()
    weekly_active = {
        e["user_id"] for e in events
        if e["event"] in LOGGING_EVENTS and week_start <= e["local_date"] <= today.isoformat()
    }
    return {
        "new_users": len(cohort),
        "day1_meal_loggers": activated,
        "day1_activation": _share(activated, len(cohort)),
        "day7_eligible": len(eligible_d7),
        "day7_meal_loggers": retained,
        "day7_retention": _share(retained, len(eligible_d7)),
        "weekly_active_loggers": len(weekly_active),
        "cohort_days": cohort_days,
        "as_of": today.isoformat(),
    }


async def metrics(cohort_days: int = 30) -> Dict[str, Any]:
    """Compute the habit numbers from stored events (as of today in the default timezone)."""
    since = (local_today() - timedelta(days=cohort_days + 7)).isoformat()
    events = await analytics.find([SIGNED_UP, *LOGGING_EVENTS], since=since)
    return compute_metrics(events, local_today(), cohort_days)
