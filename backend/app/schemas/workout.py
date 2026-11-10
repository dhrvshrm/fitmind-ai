from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class WorkoutPlanRequest(BaseModel):
    """Request to generate a workout plan.

    All fields are optional; when omitted they fall back to the values from
    the user's onboarding profile.
    """

    fitness_goal: Optional[str] = None
    experience_level: Optional[str] = None
    available_equipment: Optional[List[str]] = None


class ExerciseSchema(BaseModel):
    """A single exercise in a workout day."""

    name: str
    sets: int = 3
    reps: str = "10"
    rest: str = "60s"
    difficulty: str = "medium"
    video_url: Optional[str] = None


class WorkoutDaySchema(BaseModel):
    """A single day's workout within the weekly plan."""

    day: str
    workout_type: str = "strength"
    exercises: List[ExerciseSchema] = []


class WorkoutPlanResponse(BaseModel):
    """A full weekly workout plan."""

    week: List[WorkoutDaySchema]


class WorkoutLogRequest(BaseModel):
    """Payload for logging a completed workout."""

    exercises: List[dict] = Field(default_factory=list, max_length=50)
    duration_minutes: int = Field(0, ge=0, le=600)
    intensity: str = Field("medium", max_length=20)


class WorkoutLogResponse(BaseModel):
    """Response returned after logging a completed workout."""

    xp_earned: int
    total_xp: int
    new_level: int
    leveled_up: bool
    new_badges: List[str] = []


class ExerciseCompleteRequest(BaseModel):
    """Payload for marking a single exercise as completed."""

    exercise_name: str
    day: Optional[str] = None


class QuickSessionRequest(BaseModel):
    """A short session to replace today's: minutes available and where."""

    minutes: Literal[10, 15, 20]
    place: Literal["home", "gym"] = "home"


class ExerciseSwapRequest(BaseModel):
    """Replace a planned exercise with another catalogue exercise."""

    exercise_id: str = Field(..., min_length=1, max_length=100)
