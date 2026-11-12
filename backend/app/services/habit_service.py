"""The daily habit loop: what Today needs beyond the existing features.

- the "start again" card after missed days (never guilt, one easy action),
- whether today's recovery check-in is done,
- whether push reminders are available.
"""
import logging
from datetime import date, timezone
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from app.config.database import get_database
from app.models import nutrition, workout
from app.models.recovery import RecoveryLog
from app.models.user import User
from app.services import push_service
from app.utils.time import get_current_timezone, local_today, local_today_iso

logger = logging.getLogger(__name__)

# Full days without any log before Today offers a fresh start (and one comeback push).
RESTART_AFTER_MISSED_DAYS = 2


async def _latest_in(collection: str, user_id: str, extra: Optional[dict] = None) -> Optional[str]:
    db = get_database()
    doc = await db[collection].find_one(
        {"user_id": user_id, **(extra or {})}, {"_id": 0, "log_date": 1}, sort=[("log_date", -1)]
    )
    return doc.get("log_date") if doc else None


async def last_log_date(user_id: str) -> Optional[str]:
    """The most recent local date the user logged a meal, workout or water."""
    db = get_database()
    if db is not None:
        dates = [
            await _latest_in(nutrition.MEAL_COLLECTION, user_id),
            await _latest_in(workout.WORKOUT_LOG_COLLECTION, user_id),
            await _latest_in(nutrition.WATER_COLLECTION, user_id, {"total_ml": {"$gt": 0}}),
        ]
    else:
        dates = [d["log_date"] for d in nutrition._MEAL_MEMORY.values() if d["user_id"] == user_id]
        dates += [d["log_date"] for d in workout._WORKOUT_LOG_MEMORY.values() if d["user_id"] == user_id]
        dates += [
            key.split(":", 1)[1] for key, v in nutrition._WATER_MEMORY.items()
            if key.startswith(f"{user_id}:") and v.get("total_ml", 0) > 0
        ]
    found = [d for d in dates if d]
    return max(found) if found else None


def _signup_date(user: User) -> Optional[date]:
    created = getattr(user, "created_at", None)
    if created is None:
        return None
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return created.astimezone(ZoneInfo(get_current_timezone())).date()


def missed_days(last_active: Optional[date], today: date) -> int:
    """Full days between the last active day and today (today itself not counted)."""
    if last_active is None:
        return 0
    return max((today - last_active).days - 1, 0)


async def restart_status(user: User) -> Dict[str, Any]:
    """Whether to offer a fresh start, based on full days with nothing logged.

    Someone who never logged anything counts from the day they signed up.
    """
    last = await last_log_date(user.id)
    reference = date.fromisoformat(last) if last else _signup_date(user)
    missed = missed_days(reference, local_today())
    return {
        "show": missed >= RESTART_AFTER_MISSED_DAYS,
        "missed_days": missed,
        "last_log_date": last,
    }


async def today_status(user: User) -> Dict[str, Any]:
    """The extra bits Today shows: fresh-start card, check-in prompt, reminders."""
    latest = await RecoveryLog.get_latest_for_user(user.id)
    return {
        "date": local_today_iso(),
        "restart": await restart_status(user),
        "recovery_checked_in": bool(latest and latest.log_date == local_today_iso()),
        "push_available": push_service.is_enabled(),
        "push_subscribed": await push_service.has_subscription(user.id),
    }
