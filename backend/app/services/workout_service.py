"""Workout plans, today's session, quick sessions and swaps.

Plans are built by rules from the curated exercise catalogue (see
app/workouts): no AI is involved, so exercises, sets and reps are the same
every time for the same answers and follow the ACSM and WHO guidelines.
"""
import logging
from typing import Any, Dict, List, Optional

from app.config.database import get_database
from app.models import workout as workout_store
from app.models.recovery import RecoveryLog
from app.models.user import User
from app.models.workout import WorkoutLog, WorkoutPlan
from app.nutrition.targets import canonical_goal
from app.services import gamification_service
from app.services import analytics_service
from app.utils.time import local_today, local_today_iso
from app.workouts import catalog, planner, programming

logger = logging.getLogger(__name__)

DAYS = planner.DAYS

# Collection + in-memory fallback for per-day exercise completion tracking.
_PROGRESS_COLLECTION = "workout_progress"
_PROGRESS_MEMORY: Dict[str, set] = {}


class WorkoutServiceError(Exception):
    """Raised when a workout request can't be completed; ``kind`` maps to the HTTP status."""

    def __init__(self, message: str, kind: str = "invalid"):
        super().__init__(message)
        self.kind = kind


def _profile(user: User, goal: Optional[str] = None, experience: Optional[str] = None,
             equipment: Optional[List[str]] = None) -> Dict[str, Any]:
    return {
        "goal": canonical_goal(goal or user.fitness_goal),
        "experience": experience or user.experience_level or "beginner",
        "equipment": equipment if equipment is not None else (user.available_equipment or []),
        "injuries": user.injuries or [],
    }


async def generate_workout_plan(
    user: User,
    fitness_goal: Optional[str] = None,
    experience_level: Optional[str] = None,
    equipment: Optional[List[str]] = None,
) -> WorkoutPlan:
    """Build and save a weekly plan from the user's profile (request values override it).

    Each new plan rotates to different exercise choices than the last one.
    """
    profile = _profile(user, fitness_goal, experience_level, equipment)
    previous = await WorkoutPlan.get_latest_for_user(user.id)
    variant = (previous.meta.get("variant", -1) + 1) if previous and previous.meta else 0
    built = planner.build_week(
        goal=profile["goal"],
        experience=profile["experience"],
        equipment=profile["equipment"],
        injuries=profile["injuries"],
        days_per_week=user.workout_days_per_week,
        variant=variant,
    )
    plan = WorkoutPlan(
        user_id=user.id,
        week=built["week"],
        fitness_goal=profile["goal"],
        experience_level=profile["experience"],
        meta=built["meta"],
    )
    await plan.save()
    await analytics_service.track(user.id, analytics_service.WORKOUT_PLAN_CREATED)
    return plan


async def get_workout_plan(user_id: str) -> Optional[WorkoutPlan]:
    """Return the user's most recent workout plan, or ``None``."""
    return await WorkoutPlan.get_latest_for_user(user_id)


async def _today_recovery(user_id: str) -> Optional[int]:
    """Today's recovery score, or None if it hasn't been logged today."""
    latest = await RecoveryLog.get_latest_for_user(user_id)
    return latest.score if latest and latest.log_date == local_today_iso() else None


def _today_entry(plan: Optional[WorkoutPlan]) -> Optional[Dict[str, Any]]:
    if plan is None:
        return None
    today = DAYS[local_today().weekday()]
    return next((d for d in plan.week if str(d.get("day", "")).lower() == today.lower()), None)


async def get_today_workout(user: User) -> Dict[str, Any]:
    """Today's session: a quick session if one was chosen, else the plan's day,
    adjusted for today's recovery (fewer sets, or mobility when very low)."""
    today = local_today_iso()
    quick = await workout_store.get_override(user.id, today)
    plan = await WorkoutPlan.get_latest_for_user(user.id)
    day = _today_entry(plan)
    recovery = await _today_recovery(user.id)
    mode = programming.recovery_mode(recovery)
    base = {"day": DAYS[local_today().weekday()], "recovery_score": recovery, "has_plan": plan is not None}

    if quick:
        return {**base, **quick, "mode": "normal", "quick": True}
    if day is None:
        return {**base, "focus": None, "workout_type": "rest", "exercises": [], "mode": mode, "quick": False}

    exercises = day.get("exercises", [])
    if day.get("workout_type") == "strength" and exercises and mode == "rest":
        profile = _profile(user)
        exercises = planner.mobility_session(
            profile["goal"], planner.user_level(profile["experience"]), catalog.injured_joints(profile["injuries"])
        )
        return {**base, "focus": planner.SESSION_LABELS["mobility"], "workout_type": "flexibility",
                "exercises": exercises, "mode": mode, "quick": False, "planned_focus": day.get("focus")}
    exercises = [programming.adjust_for_recovery(e, recovery) for e in exercises]
    return {**base, "focus": day.get("focus"), "workout_type": day.get("workout_type"),
            "exercises": exercises, "mode": mode if exercises else "normal", "quick": False}


async def start_quick_session(user: User, minutes: int, place: str) -> Dict[str, Any]:
    """Replace today's session with a short circuit that fits the time available."""
    profile = _profile(user)
    previous = await workout_store.get_override(user.id, local_today_iso())
    session = planner.quick_session(
        minutes=minutes, place=place, goal=profile["goal"], experience=profile["experience"],
        equipment=profile["equipment"], injuries=profile["injuries"],
        variant=(previous or {}).get("variant", -1) + 1,
    )
    session["variant"] = (previous or {}).get("variant", -1) + 1
    await workout_store.set_override(user.id, local_today_iso(), session)
    await analytics_service.track(
        user.id, analytics_service.QUICK_SESSION_STARTED, {"minutes": minutes, "kind": place}
    )
    return await get_today_workout(user)


async def end_quick_session(user: User) -> Dict[str, Any]:
    """Go back to today's planned session."""
    await workout_store.clear_override(user.id, local_today_iso())
    return await get_today_workout(user)


def _plan_entry(plan: Optional[WorkoutPlan], day: str, index: int) -> Dict[str, Any]:
    if plan is None:
        raise WorkoutServiceError("You don't have a workout plan yet", "not_found")
    entry = next((d for d in plan.week if d.get("day", "").lower() == day.lower()), None)
    if entry is None or not 0 <= index < len(entry.get("exercises", [])):
        raise WorkoutServiceError("Exercise not found in your plan", "not_found")
    return entry


async def swap_options(user: User, day: str, index: int) -> List[Dict[str, Any]]:
    """Exercises that can replace one in the plan: same movement, allowed for the user."""
    plan = await WorkoutPlan.get_latest_for_user(user.id)
    day_entry = _plan_entry(plan, day, index)
    current = day_entry["exercises"][index]
    profile = _profile(user)
    taken = {e.get("exercise_id") for e in day_entry["exercises"]}
    options = planner.swap_options(current, equipment=profile["equipment"], injuries=profile["injuries"],
                                   experience=profile["experience"], exclude=taken)
    return [o.summary() for o in options]


async def swap_exercise(user: User, day: str, index: int, exercise_id: str) -> WorkoutPlan:
    """Replace one planned exercise with an allowed one of the same movement pattern."""
    plan = await WorkoutPlan.get_latest_for_user(user.id)
    day_entry = _plan_entry(plan, day, index)
    current = day_entry["exercises"][index]
    profile = _profile(user)
    exercise = catalog.get(exercise_id)
    allowed = {o.id for o in planner.swap_options(
        current, equipment=profile["equipment"], injuries=profile["injuries"],
        experience=profile["experience"], exclude=set(),
    )}
    if exercise is None or exercise_id not in allowed:
        raise WorkoutServiceError("That exercise can't replace this one in your plan")
    level = planner.user_level(profile["experience"])
    day_entry["exercises"][index] = planner.entry_for(
        exercise, profile["goal"], level, main_lift=current.get("main_lift", True)
    )
    plan.meta["weekly_sets"] = planner.weekly_sets(plan.week)
    await plan.save_week()
    return plan


# ---------------------------------------------------------------------------
# Completed-workout logging, XP and badges (delegated to gamification_service)
# ---------------------------------------------------------------------------
async def log_workout(
    user_id: str,
    exercises: List[Dict[str, Any]],
    duration: int,
    intensity: str = "medium",
    xp_earned: int = 0,
) -> WorkoutLog:
    """Persist a completed workout for the user and return the saved log."""
    log = WorkoutLog(
        user_id=user_id,
        exercises=exercises,
        duration_minutes=duration,
        intensity=intensity,
        xp_earned=xp_earned,
    )
    await log.save()
    await analytics_service.track(user_id, analytics_service.WORKOUT_LOGGED)
    logger.info("Logged workout for user %s (%s min, %s)", user_id, duration, intensity)
    return log


async def award_xp_for_workout(user_id: str, duration: int = 0) -> Dict[str, Any]:
    """Award workout XP (once per day) and return level info."""
    result = await gamification_service.award_action_xp(user_id, "workout")
    return {
        "xp_earned": result["xp_earned"],
        "total_xp": result["total_xp"],
        "new_level": result["level"],
        "title": result["title"],
        "leveled_up": result["leveled_up"],
    }


async def check_and_award_badges(user_id: str) -> List[str]:
    """Evaluate and award any newly-earned badges (via gamification engine)."""
    return await gamification_service.check_badge_conditions(user_id)


async def get_workout_history(user_id: str, days: int = 30) -> List[WorkoutLog]:
    """Return the user's completed-workout history, newest first."""
    return await WorkoutLog.get_history(user_id, days=days)


async def mark_exercise_complete(
    user_id: str, exercise_name: str, day: Optional[str] = None
) -> Dict[str, Any]:
    """Mark a single exercise complete for today and return today's progress."""
    today = local_today_iso()
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
