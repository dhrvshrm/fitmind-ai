from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

MealType = Literal["breakfast", "lunch", "dinner", "snack"]
ItemSource = Literal["INDB", "USDA", "custom", "ai_estimate", "unresolved", "manual"]

# "HH:MM", 24-hour, local time.
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"


class NutrientValues(BaseModel):
    """Energy (kcal) and macros (g) for an amount of food."""

    kcal: float = Field(0, ge=0, le=10000)
    protein: float = Field(0, ge=0, le=1000)
    carbs: float = Field(0, ge=0, le=1500)
    fat: float = Field(0, ge=0, le=1000)
    fiber: float = Field(0, ge=0, le=300)


class MealItem(BaseModel):
    """One food within a meal, as reviewed (and possibly edited) by the user."""

    name: str = Field(..., min_length=1, max_length=120)
    food_id: Optional[str] = Field(None, max_length=80)
    source: ItemSource = "manual"
    verified: bool = False
    quantity: float = Field(1, gt=0, le=5000)
    unit: str = Field("serving", max_length=30)
    grams: float = Field(0, ge=0, le=5000)
    nutrients: NutrientValues
    edited: bool = False


class MealLogRequest(BaseModel):
    """Payload for logging a meal: totals, plus the foods when known."""

    name: str = Field(..., min_length=1, max_length=200)
    calories: float = Field(..., ge=0, le=10000)
    protein: float = Field(0, ge=0, le=1000)
    carbs: float = Field(0, ge=0, le=1500)
    fats: float = Field(0, ge=0, le=1000)
    fiber: float = Field(0, ge=0, le=300)
    meal_type: Optional[MealType] = None
    eaten_at: Optional[str] = Field(None, pattern=TIME_PATTERN)
    items: List[MealItem] = Field(default_factory=list, max_length=20)
    # Defaults to the user's today; earlier days within a week can be backfilled.
    log_date: Optional[date] = None


class MealUpdateRequest(BaseModel):
    """Partial edit of a logged meal; only provided fields change."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    calories: Optional[float] = Field(None, ge=0, le=10000)
    protein: Optional[float] = Field(None, ge=0, le=1000)
    carbs: Optional[float] = Field(None, ge=0, le=1500)
    fats: Optional[float] = Field(None, ge=0, le=1000)
    fiber: Optional[float] = Field(None, ge=0, le=300)
    meal_type: Optional[MealType] = None
    eaten_at: Optional[str] = Field(None, pattern=TIME_PATTERN)
    items: Optional[List[MealItem]] = Field(None, max_length=20)


class EstimateRequest(BaseModel):
    """Free-text meal description, e.g. "2 aloo parathas with curd"."""

    text: str = Field(..., min_length=2, max_length=300)


class SavedMealCreate(BaseModel):
    """Save foods as a reusable meal; either from a logged meal or explicit items."""

    name: str = Field(..., min_length=1, max_length=80)
    from_meal_id: Optional[str] = None
    items: List[MealItem] = Field(default_factory=list, max_length=20)
    meal_type: Optional[MealType] = None


class SavedMealLogRequest(BaseModel):
    meal_type: Optional[MealType] = None
    eaten_at: Optional[str] = Field(None, pattern=TIME_PATTERN)


class UserFoodCreate(BaseModel):
    """A custom food or recipe with nutrition for one serving."""

    name: str = Field(..., min_length=1, max_length=80)
    aliases: List[str] = Field(default_factory=list, max_length=10)
    serving_unit: str = Field("serving", min_length=1, max_length=30)
    serving_grams: float = Field(100, gt=0, le=3000)
    calories: float = Field(..., ge=0, le=5000)
    protein: float = Field(0, ge=0, le=500)
    carbs: float = Field(0, ge=0, le=800)
    fats: float = Field(0, ge=0, le=500)
    fiber: float = Field(0, ge=0, le=200)


class WaterLogRequest(BaseModel):
    """Payload for logging water intake.

    Negative amounts undo an earlier log (e.g. a mistaken glass); the daily
    total is clamped at zero server-side.
    """

    amount_ml: int = Field(..., ge=-5000, le=5000)
