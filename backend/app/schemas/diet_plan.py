from pydantic import BaseModel, Field


class SwapRequest(BaseModel):
    """Replace one planned food with another (by food id)."""

    food_id: str = Field(..., min_length=1, max_length=80)
