import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.config.database import get_database
from app.models.workout import Exercise, WorkoutLog, WorkoutPlan
from app.ai import client as ai_client
from app.ai.client import AIError
from app.ai.style import STYLE_GUIDE
from app.services import gamification_service
from app.utils.time import local_today, local_today_iso

logger = logging.getLogger(__name__)

# Ordered days of the week used for plan structure and "today" lookups.
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Collection + in-memory fallback for per-day exercise completion tracking.
_PROGRESS_COLLECTION = "workout_progress"
_PROGRESS_MEMORY: Dict[str, set] = {}


class WorkoutServiceError(Exception):
    """Raised when a workout-service operation fails (e.g. user not found)."""


class _AIExercise(BaseModel):
    """One exercise as returned by the model (validated before use)."""

    name: str = Field(..., min_length=1, max_length=80)
    sets: int = Field(..., ge=1, le=10)
    reps: str = Field(..., min_length=1, max_length=20)
    rest: str = Field("60s", max_length=20)
    difficulty: str = Field("medium", max_length=20)

    @field_validator("reps", "rest", "difficulty", mode="before")
    @classmethod
    def _to_text(cls, value: Any) -> str:
        """Models sometimes send reps/rest as numbers; store them as text."""
        return str(value).strip()


class _AIDay(BaseModel):
    """One day of the weekly plan as returned by the model."""

    day: str
    workout_type: str = Field(..., max_length=30)
    exercises: List[_AIExercise] = Field(default_factory=list, max_length=10)

    @field_validator("day")
    @classmethod
    def _known_day(cls, value: str) -> str:
        """Accept any casing of a weekday name and store it canonically."""
        for day in DAYS:
            if value.strip().lower() == day.lower():
                return day
        raise ValueError(f"unknown day: {value}")


class _AIWeek(BaseModel):
    """The full Monday to Sunday plan; every weekday exactly once."""

    week: List[_AIDay] = Field(..., min_length=7, max_length=7)

    @model_validator(mode="after")
    def _all_days_once(self) -> "_AIWeek":
        """Reject plans that skip or repeat a weekday."""
        if sorted(d.day for d in self.week) != sorted(DAYS):
            raise ValueError("week must contain each day Monday to Sunday exactly once")
        self.week.sort(key=lambda d: DAYS.index(d.day))
        return self


_PLAN_SYSTEM_PROMPT = (
    "You are an experienced strength and conditioning coach writing training plans. "
    "Plans must be safe for the person's experience level and limitations.\n\n" + STYLE_GUIDE
)


def _build_prompt(
    goal: str,
    level: str,
    equipment: List[str],
    recovery_score: int,
    mood_score: int,
    injuries: Optional[List[str]] = None,
) -> str:
    """Build the prompt for weekly workout-plan generation."""
    equipment_str = ", ".join(equipment) if equipment else "bodyweight only"
    injuries_str = ", ".join(injuries) if injuries else "none reported"
    return (
        "Create a weekly (Monday to Sunday) workout plan.\n"
        f"- Fitness goal: {goal}\n"
        f"- Experience level: {level}\n"
        f"- Available equipment: {equipment_str}\n"
        f"- Injuries or limitations: {injuries_str}\n"
        f"- Recovery score today: {recovery_score}/100\n"
        f"- Energy (from mood check-in): {mood_score}/10\n\n"
        "Rules:\n"
        "- Include every day once. Use workout_type strength, cardio, flexibility or rest.\n"
        "- Training days have 4 to 6 exercises with sets, reps, rest and difficulty "
        "(easy, medium or hard). Rest days have no exercises.\n"
        "- Only use the listed equipment.\n"
        "- Avoid exercises that load an injured area; choose safe alternatives instead.\n"
        "- Lower volume and intensity when recovery or energy is low.\n"
        'Example exercise: {"name": "Goblet Squat", "sets": 3, "reps": "10", '
        '"rest": "60s", "difficulty": "medium"}'
    )


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
    injuries: Optional[List[str]] = None,
) -> WorkoutPlan:
    """Generate and persist a weekly workout plan.

    Uses the AI layer with a validated schema and falls back to a template
    plan if generation fails, so the endpoint always returns a usable plan.
    """
    prompt = _build_prompt(
        fitness_goal, experience_level, equipment, recovery_score, mood_score, injuries
    )
    try:
        result = await ai_client.generate_json(
            prompt, _AIWeek, system=_PLAN_SYSTEM_PROMPT, temperature=0.6, user_id=user_id
        )
        week = [
            {
                "day": d.day,
                "workout_type": d.workout_type,
                "exercises": [Exercise.normalize(e.model_dump()) for e in d.exercises],
            }
            for d in result.week
        ]
        logger.info("Generated AI workout plan for user %s", user_id)
    except AIError as e:
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
    today_name = DAYS[local_today().weekday()]
    for entry in plan.week:
        if str(entry.get("day", "")).strip().lower() == today_name.lower():
            return entry.get("exercises", [])
    return []


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
