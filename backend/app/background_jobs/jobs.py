import logging
from datetime import timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.models.user import User
from app.services import gamification_service, notification_service, report_service
from app.services import reminder_service
from app.utils.time import local_now, local_today, local_today_iso, use_timezone

logger = logging.getLogger(__name__)

# Local hour of day (24h, in each user's own timezone) for the streak warning.
STREAK_WARNING_HOUR = 20  # 8 PM
# Weekly report goes out on the user's local Sunday at 9 PM.
WEEKLY_REPORT_HOUR = 21
SUNDAY = 6

_scheduler: AsyncIOScheduler | None = None


async def streak_warning_job() -> None:
    """Warn users with an active streak who haven't worked out today.

    Runs hourly and only acts for users whose local time is 8 PM, so everyone
    is warned in the evening of their own day. The streak is recomputed
    rather than read from the stored value, which can be stale.
    """
    warned = 0
    for user in await User.get_all():
        with use_timezone(user.timezone):
            if local_now().hour != STREAK_WARNING_HOUR:
                continue
            today = local_today()
            if await gamification_service.workout_streak_ending(user.id, today) > 0:
                continue  # Already worked out today; streak is safe.
            # A streak is "at risk" when it ran through yesterday but not today.
            at_risk = await gamification_service.workout_streak_ending(
                user.id, today - timedelta(days=1)
            )
            if at_risk < 1:
                continue
            await notification_service.create_notification(
                user.id,
                notification_service.TYPE_STREAK_WARNING,
                f"Your {at_risk}-day streak ends tonight unless you log a workout.",
                meta={"current_streak": at_risk},
            )
            warned += 1
    logger.info("streak_warning_job: warned %d user(s)", warned)


async def weekly_report_job() -> None:
    """Generate and deliver a weekly report for users whose local time is Sunday 9 PM.

    Runs hourly. Each user's report is generated independently so a single
    failure (e.g. a transient AI error) does not abort the batch.
    """
    generated = 0
    for user in await User.get_all():
        with use_timezone(user.timezone):
            now = local_now()
            if now.weekday() != SUNDAY or now.hour != WEEKLY_REPORT_HOUR:
                continue
            try:
                await report_service.generate_weekly_report(user.id)
                generated += 1
            except Exception as e:
                logger.warning(
                    "weekly_report_job failed for user %s on %s: %s",
                    user.id, local_today_iso(), e,
                )
    logger.info("weekly_report_job: generated %d report(s)", generated)


async def reminder_job() -> None:
    """Send due push reminders (every 15 minutes; does nothing without VAPID keys)."""
    try:
        await reminder_service.run_due_reminders()
    except Exception as e:
        logger.warning("reminder_job failed: %s", e)


def start_scheduler() -> None:
    """Start the background scheduler and register recurring jobs.

    Both jobs run at the top of every hour (UTC) and decide per user whether
    it's the right local time, since users live in different timezones.
    """
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        streak_warning_job,
        CronTrigger(minute=0, timezone="UTC"),
        id="streak_warning",
        replace_existing=True,
    )
    _scheduler.add_job(
        weekly_report_job,
        CronTrigger(minute=0, timezone="UTC"),
        id="weekly_report",
        replace_existing=True,
    )
    # Phase 7: push reminders (meals, workout, water, comeback), each user's local time.
    _scheduler.add_job(
        reminder_job,
        CronTrigger(minute="*/15", timezone="UTC"),
        id="push_reminders",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        "Background scheduler started (hourly; streak warning at %02d:00 and weekly "
        "report Sunday %02d:00, each in the user's local time)",
        STREAK_WARNING_HOUR,
        WEEKLY_REPORT_HOUR,
    )


def stop_scheduler() -> None:
    """Shut the background scheduler down (on app shutdown)."""
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Background scheduler stopped")
