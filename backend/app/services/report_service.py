import logging
from datetime import timedelta
from typing import Any, Dict

from app.models.gamification import XP_REWARDS
from app.models.nutrition import Meal
from app.models.recovery import RecoveryLog
from app.models.report import WeeklyReport
from app.models.user import User
from app.models.voice_checkin import VoiceCheckin
from app.models.workout import WorkoutLog, WorkoutPlan
from app.ai import client as ai_client
from app.ai.client import AIError
from app.ai.style import STYLE_GUIDE
from app.services import notification_service
from app.utils.time import local_today

logger = logging.getLogger(__name__)

WEEK_DAYS = 7


def _week_dates() -> list:
    """Return ISO dates for the current week (last 7 days), oldest first."""
    today = local_today()
    return [(today - timedelta(days=i)).isoformat() for i in range(WEEK_DAYS - 1, -1, -1)]


def _mood_trend(energies_by_day: Dict[str, float], week: list) -> str:
    """Classify mood as improving/declining/stable from first vs second half."""
    first = [energies_by_day[d] for d in week[:3] if d in energies_by_day]
    second = [energies_by_day[d] for d in week[4:] if d in energies_by_day]
    if not first or not second:
        return "stable"
    delta = (sum(second) / len(second)) - (sum(first) / len(first))
    if delta > 0.5:
        return "improving"
    if delta < -0.5:
        return "declining"
    return "stable"


def _recovery_label(avg_score: float, has_data: bool) -> str:
    """Map an average recovery score to a qualitative label."""
    if not has_data:
        return "no data"
    if avg_score >= 80:
        return "excellent"
    if avg_score >= 65:
        return "good"
    if avg_score >= 50:
        return "moderate"
    return "low"


async def _planned_workouts(user_id: str) -> int:
    """Count non-rest days in the user's latest plan (defaults to 7)."""
    plan = await WorkoutPlan.get_latest_for_user(user_id)
    if plan is None:
        return WEEK_DAYS
    planned = sum(
        1
        for day in plan.week
        if str(day.get("workout_type", "")).lower() != "rest" and day.get("exercises")
    )
    return planned or WEEK_DAYS


async def _aggregate_week(user_id: str) -> Dict[str, Any]:
    """Aggregate a user's activity for the current week into report stats."""
    week = _week_dates()
    cutoff = week[0]

    # Workouts
    workout_days = {
        w.log_date
        for w in await WorkoutLog.get_history(user_id, days=500)
        if w.log_date >= cutoff
    }
    workouts_completed = len(workout_days)
    workouts_planned = await _planned_workouts(user_id)

    # Nutrition (average over days that had meals)
    daily_cals, daily_p, daily_c, daily_f = [], [], [], []
    meal_count = 0
    for day in await Meal.get_dates(user_id):
        if day >= cutoff:
            meals = await Meal.get_by_date(user_id, day)
            if meals:
                daily_cals.append(sum(m.calories for m in meals))
                daily_p.append(sum(m.protein for m in meals))
                daily_c.append(sum(m.carbs for m in meals))
                daily_f.append(sum(m.fats for m in meals))
                meal_count += len(meals)

    def _avg(values):
        return round(sum(values) / len(values)) if values else 0

    # Mood
    energies_by_day: Dict[str, float] = {}
    grouped: Dict[str, list] = {}
    for c in await VoiceCheckin.get_history(user_id, limit=1000):
        if c.log_date >= cutoff:
            grouped.setdefault(c.log_date, []).append(c.energy_level)
    for day, energies in grouped.items():
        energies_by_day[day] = sum(energies) / len(energies)
    mood_trend = _mood_trend(energies_by_day, week)

    # Recovery
    recovery_scores = [
        r.score
        for r in await RecoveryLog.get_history(user_id, days=500)
        if r.log_date >= cutoff
    ]
    avg_recovery = sum(recovery_scores) / len(recovery_scores) if recovery_scores else 0
    recovery_trend = _recovery_label(avg_recovery, bool(recovery_scores))

    # XP earned this week
    xp_earned = (
        workouts_completed * XP_REWARDS["workout"]
        + meal_count * XP_REWARDS["meal"]
        + len([1 for grp in grouped.values() for _ in grp]) * XP_REWARDS["voice_checkin"]
        + len(recovery_scores) * XP_REWARDS["recovery"]
    )

    return {
        "workouts_completed": workouts_completed,
        "workouts_planned": workouts_planned,
        "avg_calories": _avg(daily_cals),
        "avg_protein": _avg(daily_p),
        "avg_carbs": _avg(daily_c),
        "avg_fats": _avg(daily_f),
        "mood_trend": mood_trend,
        "recovery_trend": recovery_trend,
        "xp_earned": xp_earned,
    }


def _build_highlight(stats: Dict[str, Any], current_streak: int) -> str:
    """Pick a data-driven highlight moment for the week."""
    if stats["workouts_completed"] >= stats["workouts_planned"] and stats["workouts_planned"] > 0:
        return "You completed every planned workout this week."
    if current_streak >= 7:
        return f"You're on a {current_streak}-day workout streak."
    if stats["recovery_trend"] == "excellent":
        return "Your recovery stayed excellent all week."
    if stats["workouts_completed"] > 0:
        return f"You logged {stats['workouts_completed']} workout(s) this week."
    return "No workouts logged this week. A short session early next week is a good restart."


def _fallback_content(stats: Dict[str, Any], username: str) -> str:
    """Template summary used when AI generation is unavailable."""
    return (
        f"This week you completed {stats['workouts_completed']} of "
        f"{stats['workouts_planned']} planned workouts and averaged "
        f"{stats['avg_calories']} calories a day. Mood was {stats['mood_trend']} "
        f"and recovery was {stats['recovery_trend']}. You earned {stats['xp_earned']} XP."
    )


_REPORT_SYSTEM_PROMPT = (
    "You are a fitness and nutrition coach writing a client's weekly check-in note.\n\n"
    + STYLE_GUIDE
)


def _build_prompt(stats: Dict[str, Any], username: str) -> str:
    """Build the prompt for the natural-language weekly recap."""
    return (
        "Write a short weekly recap (3 to 4 sentences, second person) for "
        f"{username}. Use only these stats and do not invent numbers:\n"
        f"- Workouts completed: {stats['workouts_completed']}/{stats['workouts_planned']}\n"
        f"- Average daily calories: {stats['avg_calories']}\n"
        f"- Average macros (g): protein {stats['avg_protein']}, carbs {stats['avg_carbs']}, "
        f"fats {stats['avg_fats']}\n"
        f"- Mood trend: {stats['mood_trend']}\n"
        f"- Recovery: {stats['recovery_trend']}\n"
        f"- XP earned: {stats['xp_earned']}\n"
        "Note what went well, name the one gap that matters most, and give one "
        "specific thing to do next week."
    )


async def generate_weekly_report(user_id: str) -> WeeklyReport:
    """Aggregate the week, generate an AI recap, save it, and notify the user."""
    user = await User.get_by_id(user_id)
    username = user.username if user else "there"

    stats = await _aggregate_week(user_id)
    highlight = _build_highlight(stats, user.current_streak if user else 0)

    try:
        content = await ai_client.generate_text(
            _build_prompt(stats, username),
            system=_REPORT_SYSTEM_PROMPT,
            temperature=0.6,
            user_id=user_id,
        )
    except AIError as e:
        logger.info("Weekly report using fallback content: %s", e)
        content = _fallback_content(stats, username)

    week = _week_dates()
    report = WeeklyReport(
        user_id=user_id,
        week_start=week[0],
        week_end=week[-1],
        stats=stats,
        content=content,
        highlight=highlight,
    )
    await report.save()

    await notification_service.create_notification(
        user_id,
        notification_service.TYPE_WEEKLY_REPORT,
        "Your weekly report is ready! See how your week went.",
        meta={"report_id": report.id},
    )
    logger.info("Generated weekly report for user %s", user_id)
    return report


async def get_report_history(user_id: str, limit: int = 52):
    """Return the user's past weekly reports, newest first."""
    return await WeeklyReport.get_for_user(user_id, limit=limit)


async def get_report(report_id: str):
    """Return a single report by id, or ``None``."""
    return await WeeklyReport.get_by_id(report_id)


async def get_latest_report(user_id: str):
    """Return the user's most recent report, or ``None``."""
    return await WeeklyReport.get_latest(user_id)
