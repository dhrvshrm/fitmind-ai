from typing import List

from pydantic import BaseModel, Field


class MealLogRequest(BaseModel):
    """Payload for logging a meal with its macros (grams)."""

    name: str
    calories: float = Field(..., ge=0)
    protein: float = Field(0, ge=0)
    carbs: float = Field(0, ge=0)
    fats: float = Field(0, ge=0)


class MealResponse(BaseModel):
    """A single logged meal."""

    id: str
    name: str
    calories: float
    protein: float
    carbs: float
    fats: float
    date: str


class MacroTotals(BaseModel):
    """Aggregated macro totals for a day."""

    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fats: float = 0


class WaterLogRequest(BaseModel):
    """Payload for logging water intake.

    Negative amounts undo an earlier log (e.g. a mistaken glass); the daily
    total is clamped at zero server-side.
    """

    amount_ml: int = Field(..., ge=-5000, le=5000)


class NutritionSummaryResponse(BaseModel):
    """Full daily nutrition summary with goals and progress."""

    date: str
    totals: MacroTotals
    goals: MacroTotals
    macro_percentages: dict
    calories_remaining: float
    water_ml: int
    meals_logged: int
    meals: List[MealResponse]
