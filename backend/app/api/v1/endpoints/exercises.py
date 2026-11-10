from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.workouts import catalog

router = APIRouter(prefix="/exercises", tags=["Exercises"])


@router.get("", response_model=SuccessResponse)
async def search_exercises(
    q: Optional[str] = Query(None, max_length=60),
    muscle: Optional[str] = Query(None, max_length=30),
    equipment: Optional[str] = Query(None, max_length=30),
    curated: bool = Query(False, description="Only exercises with FitMind coaching notes"),
    limit: int = Query(40, ge=1, le=100),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Search the exercise library (free-exercise-db), curated exercises first."""
    results = catalog.search(q, muscle, equipment, curated, limit)
    return {
        "success": True,
        "message": "Exercises",
        "data": {"exercises": [e.summary() for e in results], "muscles": sorted(catalog.MUSCLES)},
    }


@router.get("/{exercise_id}", response_model=SuccessResponse)
async def get_exercise(exercise_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """One exercise: demonstration photos, primary, secondary and stabiliser
    muscles, and (for curated exercises) setup, cues, mistakes and breathing."""
    exercise = catalog.get(exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    detail = exercise.detail()
    coaching = exercise.coaching
    for key, linked_id in (("easier", coaching and coaching.easier), ("harder", coaching and coaching.harder)):
        linked = catalog.get(linked_id) if linked_id else None
        detail[key] = linked.summary() if linked else None
    return {"success": True, "message": "Exercise", "data": detail}
