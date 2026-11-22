from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.nutrition import MealType


class SwapRequest(BaseModel):
    """Replace one planned food with another (by food id)."""

    food_id: str = Field(..., min_length=1, max_length=80)


class TreatLogRequest(BaseModel):
    """Log a treat; it counts as a snack unless another meal type is given."""

    meal_type: Optional[MealType] = None
