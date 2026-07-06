from pydantic import BaseModel
from typing import List
from datetime import datetime

class WorkoutPlanRequest(BaseModel):
    fitness_goal: str
    experience_level: str
    available_equipment: List[str]

class WorkoutLogRequest(BaseModel):
    date: datetime
    duration_minutes: int
    exercises: List[dict]
