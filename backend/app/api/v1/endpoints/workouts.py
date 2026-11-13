from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.workout import (
    ExerciseCompleteRequest,
    ExerciseSwapRequest,
    QuickSessionRequest,
    WorkoutLogRequest,
    WorkoutPlanRequest,
)
from app.services import notification_service, progression_service, workout_service
from app.services.progression_service import ProgressionError
from app.services.workout_service import WorkoutServiceError

router = APIRouter(prefix="/workouts", tags=["Workouts"])


def _http(exc: WorkoutServiceError) -> HTTPException:
    code = status.HTTP_404_NOT_FOUND if exc.kind == "not_found" else status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=code, detail=str(exc))


def _progression_http(exc: ProgressionError) -> HTTPException:
    code = status.HTTP_404_NOT_FOUND if exc.kind == "not_found" else status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=code, detail=str(exc))


def _plan_data(plan) -> dict:
    # Plans made before the exercise catalogue have no meta; send null, not {}.
    return {"week": plan.week, "meta": plan.meta or None}


@router.post("/generate", response_model=SuccessResponse)
async def generate_workout_plan(
    request: WorkoutPlanRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Build a weekly plan from the curated exercise catalogue.

    Sets, reps and rest follow the ACSM and WHO guidelines; exercises are
    filtered for the user's equipment, injuries and level. Goal, level and
    equipment default to the profile. Each new plan rotates exercise choices.
    """
    plan = await workout_service.generate_workout_plan(
        current_user,
        fitness_goal=request.fitness_goal,
        experience_level=request.experience_level,
        equipment=request.available_equipment,
    )
    return {"success": True, "message": "Workout plan generated", "data": {"weekly_plan": _plan_data(plan)}}


@router.get("/plan/week", response_model=SuccessResponse)
async def get_weekly_plan(current_user: User = Depends(get_current_user)) -> dict:
    """Return the user's current weekly workout plan."""
    plan = await workout_service.get_workout_plan(current_user.id)
    return {
        "success": True,
        "message": "Weekly plan retrieved",
        "data": {"plan": _plan_data(plan) if plan else None},
    }


@router.get("/plan/today", response_model=SuccessResponse)
async def get_today_workout(current_user: User = Depends(get_current_user)) -> dict:
    """Today's session: a chosen quick session, or the plan's day adjusted for
    today's recovery score (fewer sets when low, mobility when very low).

    Each exercise carries a ``target`` from progressive overload (what was
    lifted last time and what to aim for today); an accepted easy week trims sets."""
    today = await workout_service.get_today_workout(current_user)
    today = await progression_service.decorate_today(current_user, today)
    return {"success": True, "message": "Today's workout retrieved", "data": today}


@router.post("/quick", response_model=SuccessResponse)
async def start_quick_session(payload: QuickSessionRequest, current_user: User = Depends(get_current_user)) -> dict:
    """Replace today's session with a 10, 15 or 20 minute circuit (home or gym)."""
    today = await workout_service.start_quick_session(current_user, payload.minutes, payload.place)
    return {"success": True, "message": "Quick session ready", "data": today}


@router.delete("/quick", response_model=SuccessResponse)
async def end_quick_session(current_user: User = Depends(get_current_user)) -> dict:
    """Go back to today's planned session."""
    today = await workout_service.end_quick_session(current_user)
    return {"success": True, "message": "Back to your plan", "data": today}


@router.get("/plan/{day}/exercises/{index}/alternatives", response_model=SuccessResponse)
async def swap_options(day: str, index: int, current_user: User = Depends(get_current_user)) -> dict:
    """Exercises with the same movement pattern that suit the user's equipment, injuries and level."""
    try:
        options = await workout_service.swap_options(current_user, day, index)
    except WorkoutServiceError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Alternatives", "data": options}


@router.post("/plan/{day}/exercises/{index}/swap", response_model=SuccessResponse)
async def swap_exercise(
    day: str, index: int, payload: ExerciseSwapRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Replace one exercise in the weekly plan."""
    try:
        plan = await workout_service.swap_exercise(current_user, day, index, payload.exercise_id)
    except WorkoutServiceError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Exercise swapped", "data": {"plan": _plan_data(plan)}}


@router.post("/log", response_model=SuccessResponse)
async def log_workout(
    log_data: WorkoutLogRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Log a completed workout: award XP (once per day), recompute level, check badges."""
    xp = await workout_service.award_xp_for_workout(
        current_user.id, duration=log_data.duration_minutes
    )
    await workout_service.log_workout(
        current_user.id,
        exercises=log_data.exercises,
        duration=log_data.duration_minutes,
        intensity=log_data.intensity,
        xp_earned=xp["xp_earned"],
    )
    # Sets with weight and reps feed progressive overload and personal records.
    records = await progression_service.record_sets(current_user.id, log_data.exercises)
    new_badges = await workout_service.check_and_award_badges(current_user.id)
    message = (
        f"Workout logged. +{xp['xp_earned']} XP."
        if xp["xp_earned"]
        else "Workout logged."
    )
    await notification_service.create_notification(
        current_user.id,
        notification_service.TYPE_WORKOUT_LOGGED,
        message,
        meta={"xp_earned": xp["xp_earned"], "total_xp": xp["total_xp"]},
    )
    return {
        "success": True,
        "message": "Workout logged",
        "data": {
            "xp_earned": xp["xp_earned"],
            "total_xp": xp["total_xp"],
            "new_level": xp["new_level"],
            "leveled_up": xp["leveled_up"],
            "new_badges": new_badges,
            "new_records": records,
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


@router.get("/progression", response_model=SuccessResponse)
async def progression_suggestions(current_user: User = Depends(get_current_user)) -> dict:
    """An easy week when main lifts have stalled, and whether the user looks ready for the next level."""
    data = await progression_service.suggestions(current_user)
    return {"success": True, "message": "Progression suggestions", "data": data}


@router.post("/deload", response_model=SuccessResponse)
async def start_deload(current_user: User = Depends(get_current_user)) -> dict:
    """Start a 7-day easy week: fewer sets, same weights, lighter effort."""
    data = await progression_service.start_deload(current_user)
    return {"success": True, "message": "Easy week started", "data": data}


@router.delete("/deload", response_model=SuccessResponse)
async def end_deload(current_user: User = Depends(get_current_user)) -> dict:
    data = await progression_service.end_deload(current_user)
    return {"success": True, "message": "Easy week ended", "data": data}


@router.post("/progression/{kind}/snooze", response_model=SuccessResponse)
async def snooze_suggestion(kind: str, current_user: User = Depends(get_current_user)) -> dict:
    """Hide the deload or level suggestion for two weeks."""
    try:
        data = await progression_service.snooze(current_user, kind)
    except ProgressionError as exc:
        raise _progression_http(exc)
    return {"success": True, "message": "Suggestion hidden", "data": data}


@router.post("/level-up", response_model=SuccessResponse)
async def level_up(current_user: User = Depends(get_current_user)) -> dict:
    """Move to the next training level and rebuild the weekly plan (only when ready)."""
    try:
        data = await progression_service.level_up(current_user)
    except ProgressionError as exc:
        raise _progression_http(exc)
    return {"success": True, "message": "Level updated", "data": data}


@router.get("/strength", response_model=SuccessResponse)
async def strength_summary(current_user: User = Depends(get_current_user)) -> dict:
    """Most-trained weighted lifts with their estimated one-rep-max trend."""
    data = await progression_service.strength_summary(current_user)
    return {"success": True, "message": "Strength progress", "data": data}


@router.get("/exercises/{exercise_id}/history", response_model=SuccessResponse)
async def exercise_history(exercise_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Every logged session of one exercise, oldest first."""
    try:
        data = await progression_service.exercise_history(current_user, exercise_id)
    except ProgressionError as exc:
        raise _progression_http(exc)
    return {"success": True, "message": "Exercise history", "data": data}
