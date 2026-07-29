import logging
from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Dict, List

from app.models.gamification import XP_REWARDS
from app.models.nutrition import Meal
from app.models.recovery import RecoveryLog
from app.models.user import User
from app.models.voice_checkin import VoiceCheckin
from app.models.weight import WeightLog
from app.models.workout import WorkoutLog

logger = logging.getLogger(__name__)


def _date_labels(days: int) -> List[str]:
    """Return ISO date strings for the last ``days`` days, oldest first."""
    today = date.today()
    return [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]


def _round(value: float, ndigits: int = 1) -> float:
    """Round a value, returning a plain float (0 for empty aggregates)."""
    return round(value, ndigits) if value else 0.0


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
async def get_dashboard_summary(user_id: str) -> Dict[str, Any]:
    """Return today's headline metrics: XP, level, streak, mood, recovery."""
    user = await User.get_by_id(user_id)
    if user is None:
        return {}

    today = date.today().isoformat()
    workouts_today = sum(
        1 for w in await WorkoutLog.get_history(user_id, days=50) if w.log_date == today
    )
    latest_recovery = await RecoveryLog.get_latest_for_user(user_id)
    latest_voice = await VoiceCheckin.get_history(user_id, limit=1)

    return {
        "xp": user.xp,
        "level": user.level,
        "streak": user.current_streak,
        "mood_score": latest_voice[0].energy_level if latest_voice else None,
        "recovery_score": latest_recovery.score if latest_recovery else 0,
        "workouts_today": workouts_today,
    }


# ---------------------------------------------------------------------------
# Mood / energy performance (last 30 days)
# ---------------------------------------------------------------------------
async def get_mood_performance_data(user_id: str) -> Dict[str, Any]:
    """Return average energy per day from voice check-ins over the last 30 days."""
    cutoff = _date_labels(30)[0]
    checkins = [
        c for c in await VoiceCheckin.get_history(user_id, limit=1000) if c.log_date >= cutoff
    ]

    by_day: Dict[str, List[VoiceCheckin]] = defaultdict(list)
    for c in checkins:
        by_day[c.log_date].append(c)

    data = []
    for day in sorted(by_day):
        entries = by_day[day]
        avg_energy = sum(e.energy_level for e in entries) / len(entries)
        data.append(
            {
                "date": day,
                "energy": _round(avg_energy),
                "mood": entries[-1].mood,
            }
        )

    energies = [d["energy"] for d in data]
    moods = [c.mood for c in checkins]
    summary = {
        "average_energy": _round(sum(energies) / len(energies)) if energies else 0,
        "total_checkins": len(checkins),
        "dominant_mood": max(set(moods), key=moods.count) if moods else None,
    }
    return {"data": data, "summary": summary}


# ---------------------------------------------------------------------------
# Weight trend (last 90 days)
# ---------------------------------------------------------------------------
async def get_weight_trend(user_id: str) -> Dict[str, Any]:
    """Return the user's body-weight trend over the last 90 days."""
    logs = await WeightLog.get_history(user_id, days=90)
    data = [{"date": log.log_date, "weight": log.weight_kg} for log in logs]

    # Fall back to the profile weight as a single point if nothing is logged.
    if not data:
        user = await User.get_by_id(user_id)
        if user and user.weight_kg:
            data = [{"date": date.today().isoformat(), "weight": user.weight_kg}]

    weights = [d["weight"] for d in data]
    summary = {
        "start_weight": weights[0] if weights else None,
        "current_weight": weights[-1] if weights else None,
        "change": _round(weights[-1] - weights[0]) if len(weights) >= 2 else 0,
        "min_weight": min(weights) if weights else None,
        "max_weight": max(weights) if weights else None,
        "entries": len(weights),
    }
    return {"data": data, "summary": summary}


# ---------------------------------------------------------------------------
# Workout completion rate (last 30 days)
# ---------------------------------------------------------------------------
async def get_workout_completion_rate(user_id: str) -> Dict[str, Any]:
    """Return daily workout counts and the 30-day completion rate."""
    labels = _date_labels(30)
    cutoff = labels[0]

    counts: Dict[str, int] = defaultdict(int)
    for w in await WorkoutLog.get_history(user_id, days=500):
        if w.log_date >= cutoff:
            counts[w.log_date] += 1

    data = [{"date": day, "workouts": counts.get(day, 0)} for day in labels]
    active_days = sum(1 for day in labels if counts.get(day, 0) > 0)
    total = sum(counts.values())
    summary = {
        "total_workouts": total,
        "active_days": active_days,
        "period_days": 30,
        "completion_rate": _round(active_days / 30 * 100),
    }
    return {"data": data, "summary": summary}


# ---------------------------------------------------------------------------
# XP earned this week (last 7 days, daily)
# ---------------------------------------------------------------------------
async def _xp_by_date(user_id: str, cutoff: str) -> Dict[str, int]:
    """Compute XP earned per day (from activity) since ``cutoff`` inclusive."""
    xp: Dict[str, int] = defaultdict(int)

    for w in await WorkoutLog.get_history(user_id, days=500):
        if w.log_date >= cutoff:
            xp[w.log_date] += XP_REWARDS["workout"]
    for r in await RecoveryLog.get_history(user_id, days=500):
        if r.log_date >= cutoff:
            xp[r.log_date] += XP_REWARDS["recovery"]
    for v in await VoiceCheckin.get_history(user_id, limit=1000):
        if v.log_date >= cutoff:
            xp[v.log_date] += XP_REWARDS["voice_checkin"]
    for day in await Meal.get_dates(user_id):
        if day >= cutoff:
            meals = await Meal.get_by_date(user_id, day)
            xp[day] += len(meals) * XP_REWARDS["meal"]

    return xp


async def get_xp_earned_weekly(user_id: str) -> Dict[str, Any]:
    """Return XP earned per day over the last 7 days plus the weekly total."""
    labels = _date_labels(7)
    xp = await _xp_by_date(user_id, labels[0])

    data = [{"date": day, "xp": xp.get(day, 0)} for day in labels]
    totals = [d["xp"] for d in data]
    summary = {
        "weekly_total": sum(totals),
        "daily_average": _round(sum(totals) / 7),
        "best_day": max(data, key=lambda d: d["xp"])["date"] if any(totals) else None,
    }
    return {"data": data, "summary": summary}


# ---------------------------------------------------------------------------
# Recovery trend (last 14 days)
# ---------------------------------------------------------------------------
async def get_recovery_trend(user_id: str) -> Dict[str, Any]:
    """Return recovery scores over the last 14 days with trend statistics."""
    cutoff = _date_labels(14)[0]
    logs = [
        log for log in await RecoveryLog.get_history(user_id, days=500) if log.log_date >= cutoff
    ]
    logs.sort(key=lambda log: log.log_date)

    data = [{"date": log.log_date, "score": log.score} for log in logs]
    scores = [d["score"] for d in data]
    trend = "flat"
    if len(scores) >= 2:
        trend = "up" if scores[-1] > scores[0] else "down" if scores[-1] < scores[0] else "flat"

    summary = {
        "average_score": _round(sum(scores) / len(scores)) if scores else 0,
        "latest_score": scores[-1] if scores else None,
        "min_score": min(scores) if scores else None,
        "max_score": max(scores) if scores else None,
        "trend": trend,
        "entries": len(scores),
    }
    return {"data": data, "summary": summary}
