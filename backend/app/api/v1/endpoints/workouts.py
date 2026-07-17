from fastapi import APIRouter, Depends, Query

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.workout import (
    ExerciseCompleteRequest,
    WorkoutLogRequest,
    WorkoutPlanRequest,
)
from app.services import recovery_service, voice_service, workout_service

router = APIRouter(prefix="/workouts", tags=["Workouts"])


async def _resolve_mood_score(user_id: str) -> int:
    """Return the user's latest voice-check-in energy level, defaulting to 5."""
    history = await voice_service.get_voice_history(user_id, limit=1)
    return history[0].energy_level if history else 5


@router.post("/generate", response_model=SuccessResponse)
async def generate_workout_plan(
    request: WorkoutPlanRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Generate a weekly workout plan, adapted to recovery and mood.

    Goal/level/equipment fall back to the user's onboarding profile when not
    supplied in the request.
    """
    goal = request.fitness_goal or current_user.fitness_goal or "general_fitness"
    level = request.experience_level or current_user.experience_level or "beginner"
    equipment = (
        request.available_equipment
        if request.available_equipment is not None
        else current_user.available_equipment
    )

    recovery_score = await recovery_service.get_recovery_score(current_user.id)
    mood_score = await _resolve_mood_score(current_user.id)

    plan = await workout_service.generate_workout_plan(
        user_id=current_user.id,
        fitness_goal=goal,
        experience_level=level,
        equipment=equipment,
        recovery_score=recovery_score,
        mood_score=mood_score,
    )
    return {
        "success": True,
        "message": "Workout plan generated",
        "data": {"weekly_plan": {"week": plan.week}},
    }


@router.get("/plan/week", response_model=SuccessResponse)
async def get_weekly_plan(current_user: User = Depends(get_current_user)) -> dict:
    """Return the user's current weekly workout plan."""
    plan = await workout_service.get_workout_plan(current_user.id)
    return {
        "success": True,
        "message": "Weekly plan retrieved",
        "data": {"plan": {"week": plan.week} if plan else None},
    }


@router.get("/plan/today", response_model=SuccessResponse)
async def get_today_workout(current_user: User = Depends(get_current_user)) -> dict:
    """Return today's exercises from the user's current plan."""
    exercises = await workout_service.get_today_workout(current_user.id)
    return {
        "success": True,
        "message": "Today's workout retrieved",
        "data": {"exercises": exercises},
    }


@router.post("/log", response_model=SuccessResponse)
async def log_workout(
    log_data: WorkoutLogRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Log a completed workout: award XP, recompute level, and check badges."""
    await workout_service.log_workout(
        current_user.id,
        exercises=log_data.exercises,
        duration=log_data.duration_minutes,
        intensity=log_data.intensity,
    )
    xp = await workout_service.award_xp_for_workout(
        current_user.id, duration=log_data.duration_minutes
    )
    new_badges = await workout_service.check_and_award_badges(current_user.id)
    return {
        "success": True,
        "message": "Workout logged",
        "data": {
            "xp_earned": xp["xp_earned"],
            "total_xp": xp["total_xp"],
            "new_level": xp["new_level"],
            "leveled_up": xp["leveled_up"],
            "new_badges": new_badges,
        },
    }


@router.get("/history", response_model=SuccessResponse)
async def get_workout_history(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the user's completed-workout history (newest first)."""
    logs = await workout_service.get_workout_history(current_user.id, days=days)
    return {
        "success": True,
        "message": "Workout history retrieved",
        "data": {
            "workouts": [
                {
                    "date": log.log_date,
                    "duration_minutes": log.duration_minutes,
                    "intensity": log.intensity,
                    "xp_earned": log.xp_earned,
                    "exercises": log.exercises,
                }
                for log in logs
            ],
        },
    }


@router.put("/exercise/complete", response_model=SuccessResponse)
async def complete_exercise(
    payload: ExerciseCompleteRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Mark a single exercise as completed for today."""
    progress = await workout_service.mark_exercise_complete(
        current_user.id, payload.exercise_name, day=payload.day
    )
    return {
        "success": True,
        "message": "Exercise marked complete",
        "data": progress,
    }
