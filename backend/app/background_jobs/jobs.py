import logging
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.models.user import User
from app.models.workout import WorkoutLog
from app.services import notification_service

logger = logging.getLogger(__name__)

# Hour of day (24h, server local time) to run the streak-warning job.
STREAK_WARNING_HOUR = 20  # 8 PM

_scheduler: AsyncIOScheduler | None = None


async def streak_warning_job() -> None:
    """Warn users with an active streak who haven't worked out today.

    Runs daily at 8 PM. For each user whose current streak is at least 1 and
    who has not logged a workout today, create a ``streak_warning``
    notification so they can preserve their streak.
    """
    today = date.today().isoformat()
    warned = 0
    for user in await User.get_all():
        if user.current_streak < 1:
            continue
        workout_dates = await WorkoutLog.get_workout_dates(user.id)
        if today in workout_dates:
            continue  # Already worked out today; streak is safe.
        await notification_service.create_notification(
            user.id,
            notification_service.TYPE_STREAK_WARNING,
            f"Your {user.current_streak}-day streak is at risk! "
            "Log a workout before midnight to keep it alive.",
            meta={"current_streak": user.current_streak},
        )
        warned += 1
    logger.info("streak_warning_job: warned %d user(s)", warned)


def start_scheduler() -> None:
    """Start the background scheduler and register recurring jobs."""
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        streak_warning_job,
        CronTrigger(hour=STREAK_WARNING_HOUR, minute=0),
        id="streak_warning",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Background scheduler started (streak warning at %02d:00)", STREAK_WARNING_HOUR)


def stop_scheduler() -> None:
    """Shut the background scheduler down (on app shutdown)."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Background scheduler stopped")
