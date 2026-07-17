import json
import logging
import re
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from app.config.database import get_database
from app.models.user import User
from app.models.workout import Exercise, WorkoutLog, WorkoutPlan
from app.services import ai_service
from app.services.ai_service import AIServiceError

logger = logging.getLogger(__name__)

# Ordered days of the week used for plan structure and "today" lookups.
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Gamification constants.
XP_PER_WORKOUT = 50
XP_PER_LEVEL = 100
BADGE_7_DAY_WARRIOR = "7_day_warrior"
STREAK_FOR_WARRIOR = 7

# Collection + in-memory fallback for per-day exercise completion tracking.
_PROGRESS_COLLECTION = "workout_progress"
_PROGRESS_MEMORY: Dict[str, set] = {}


class WorkoutServiceError(Exception):
    """Raised when a workout-service operation fails (e.g. user not found)."""


def _build_prompt(
    goal: str,
    level: str,
    equipment: List[str],
    recovery_score: int,
    mood_score: int,
) -> str:
    """Build the Gemini prompt for weekly workout-plan generation."""
    equipment_str = ", ".join(equipment) if equipment else "bodyweight only"
    return (
        "Create a weekly (Monday-Sunday) workout plan with the following:\n"
        f"- Fitness Goal: {goal}\n"
        f"- Experience Level: {level}\n"
        f"- Available Equipment: {equipment_str}\n"
        f"- Recovery Score Today: {recovery_score}/100\n"
        f"- Mood Score: {mood_score}/10\n\n"
        "For each day, include:\n"
        "- Workout type (strength/cardio/flexibility/rest)\n"
        "- 4-6 exercises with: name, sets, reps, rest time, difficulty level\n"
        "- Adapt intensity based on the recovery and mood scores\n\n"
        "Return ONLY valid JSON with this exact structure:\n"
        '{"week": [{"day": "Monday", "workout_type": "strength", '
        '"exercises": [{"name": "...", "sets": 3, "reps": "10", '
        '"rest": "60s", "difficulty": "medium"}]}]}'
    )


def _parse_plan(raw: str) -> List[Dict[str, Any]]:
    """Parse the model's JSON response into a normalized weekly structure.

    Raises:
        ValueError: if no valid week array can be extracted.
    """
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("no JSON object found in model response")
    data = json.loads(match.group(0))
    week_raw = data.get("week")
    if not isinstance(week_raw, list) or not week_raw:
        raise ValueError("model response missing a non-empty 'week' array")

    week: List[Dict[str, Any]] = []
    for entry in week_raw:
        if not isinstance(entry, dict):
            continue
        exercises = entry.get("exercises") or []
        week.append(
            {
                "day": str(entry.get("day", "")).strip() or "Day",
                "workout_type": str(entry.get("workout_type", "strength")).strip(),
                "exercises": [
                    Exercise.normalize(e) for e in exercises if isinstance(e, dict)
                ],
            }
        )
    if not week:
        raise ValueError("no valid days parsed from model response")
    return week


def _fallback_week(goal: str, level: str, equipment: List[str]) -> List[Dict[str, Any]]:
    """Build a sensible template plan used when AI generation is unavailable."""
    strength = [
        Exercise("Squats", 3, "12", "60s", level).to_dict(),
        Exercise("Push-ups", 3, "12", "60s", level).to_dict(),
        Exercise("Bent-over Rows", 3, "12", "60s", level).to_dict(),
        Exercise("Plank", 3, "45s", "45s", level).to_dict(),
    ]
    cardio = [
        Exercise("Jumping Jacks", 3, "40", "30s", level).to_dict(),
        Exercise("High Knees", 3, "40", "30s", level).to_dict(),
        Exercise("Mountain Climbers", 3, "30", "30s", level).to_dict(),
        Exercise("Burpees", 3, "10", "45s", level).to_dict(),
    ]
    mobility = [
        Exercise("Cat-Cow Stretch", 2, "10", "20s", "easy").to_dict(),
        Exercise("World's Greatest Stretch", 2, "8", "20s", "easy").to_dict(),
        Exercise("Hip Flexor Stretch", 2, "30s", "20s", "easy").to_dict(),
    ]
    layout = [
        ("Monday", "strength", strength),
        ("Tuesday", "cardio", cardio),
        ("Wednesday", "flexibility", mobility),
        ("Thursday", "strength", strength),
        ("Friday", "cardio", cardio),
        ("Saturday", "strength", strength),
        ("Sunday", "rest", []),
    ]
    return [
        {"day": day, "workout_type": wtype, "exercises": exercises}
        for day, wtype, exercises in layout
    ]


async def generate_workout_plan(
    user_id: str,
    fitness_goal: str,
    experience_level: str,
    equipment: List[str],
    recovery_score: int = 0,
    mood_score: int = 5,
) -> WorkoutPlan:
    """Generate and persist a weekly workout plan.

    Uses Gemini when available and falls back to a template plan if the AI
    call or parsing fails, so the endpoint always returns a usable plan.
    """
    prompt = _build_prompt(
        fitness_goal, experience_level, equipment, recovery_score, mood_score
    )
    try:
        raw = ai_service.generate_text(prompt, temperature=0.7, json_mode=True)
        week = _parse_plan(raw)
        logger.info("Generated AI workout plan for user %s", user_id)
    except (AIServiceError, ValueError, json.JSONDecodeError) as e:
        logger.warning("Falling back to template workout plan: %s", e)
        week = _fallback_week(fitness_goal, experience_level, equipment)

    plan = WorkoutPlan(
        user_id=user_id,
        week=week,
        fitness_goal=fitness_goal,
        experience_level=experience_level,
    )
    await plan.save()
    return plan


async def get_workout_plan(user_id: str) -> Optional[WorkoutPlan]:
    """Return the user's most recent workout plan, or ``None``."""
    return await WorkoutPlan.get_latest_for_user(user_id)


async def get_today_workout(user_id: str) -> List[Dict[str, Any]]:
    """Return the exercises for today from the user's latest plan.

    Returns an empty list if there is no plan or no matching day.
    """
    plan = await WorkoutPlan.get_latest_for_user(user_id)
    if plan is None:
        return []
    today_name = DAYS[date.today().weekday()]
    for entry in plan.week:
        if str(entry.get("day", "")).strip().lower() == today_name.lower():
            return entry.get("exercises", [])
    return []


# ---------------------------------------------------------------------------
# Completed-workout logging, XP and badges
# ---------------------------------------------------------------------------
def _level_for_xp(xp: int) -> int:
    """Return the level for a given XP total (100 XP per level, starting at 1)."""
    return xp // XP_PER_LEVEL + 1


def _current_streak(workout_dates: set) -> int:
    """Count consecutive days with a workout ending today.

    Returns 0 if there is no workout logged today (the streak is broken).
    """
    streak = 0
    day = date.today()
    while day.isoformat() in workout_dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


async def log_workout(
    user_id: str,
    exercises: List[Dict[str, Any]],
    duration: int,
    intensity: str = "medium",
) -> WorkoutLog:
    """Persist a completed workout for the user and return the saved log."""
    log = WorkoutLog(
        user_id=user_id,
        exercises=exercises,
        duration_minutes=duration,
        intensity=intensity,
        xp_earned=XP_PER_WORKOUT,
    )
    await log.save()
    logger.info("Logged workout for user %s (%s min, %s)", user_id, duration, intensity)
    return log


async def award_xp_for_workout(user_id: str, duration: int = 0) -> Dict[str, Any]:
    """Award +50 XP for a completed workout and recompute the user's level.

    Returns the XP awarded, new totals and whether the user levelled up.

    Raises:
        WorkoutServiceError: if the user does not exist.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise WorkoutServiceError("User not found")

    old_level = user.level
    new_xp = user.xp + XP_PER_WORKOUT
    new_level = _level_for_xp(new_xp)
    await user.update({"xp": new_xp, "level": new_level})
    return {
        "xp_earned": XP_PER_WORKOUT,
        "total_xp": new_xp,
        "new_level": new_level,
        "leveled_up": new_level > old_level,
    }


async def check_and_award_badges(user_id: str) -> List[str]:
    """Award any newly-earned badges (currently the 7-day warrior streak)."""
    user = await User.get_by_id(user_id)
    if user is None:
        return []

    new_badges: List[str] = []
    workout_dates = set(await WorkoutLog.get_workout_dates(user_id))
    if (
        _current_streak(workout_dates) >= STREAK_FOR_WARRIOR
        and BADGE_7_DAY_WARRIOR not in user.badges
    ):
        new_badges.append(BADGE_7_DAY_WARRIOR)

    if new_badges:
        await user.update({"badges": user.badges + new_badges})
        logger.info("Awarded badges to user %s: %s", user_id, new_badges)
    return new_badges


async def get_workout_history(user_id: str, days: int = 30) -> List[WorkoutLog]:
    """Return the user's completed-workout history, newest first."""
    return await WorkoutLog.get_history(user_id, days=days)


async def mark_exercise_complete(
    user_id: str, exercise_name: str, day: Optional[str] = None
) -> Dict[str, Any]:
    """Mark a single exercise complete for today and return today's progress."""
    today = date.today().isoformat()
    db = get_database()
    if db is not None:
        await db[_PROGRESS_COLLECTION].update_one(
            {"user_id": user_id, "log_date": today},
            {"$addToSet": {"completed_exercises": exercise_name}},
            upsert=True,
        )
        doc = await db[_PROGRESS_COLLECTION].find_one(
            {"user_id": user_id, "log_date": today}
        )
        completed = doc.get("completed_exercises", []) if doc else []
    else:
        key = f"{user_id}:{today}"
        completed_set = _PROGRESS_MEMORY.setdefault(key, set())
        completed_set.add(exercise_name)
        completed = list(completed_set)

    logger.info("User %s completed exercise '%s'", user_id, exercise_name)
    return {
        "exercise_name": exercise_name,
        "completed_today": completed,
        "completed_count": len(completed),
    }
