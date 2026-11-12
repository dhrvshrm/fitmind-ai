"""Meal photo -> foods -> nutrition from the food database.

The vision model only names the dishes and guesses rough portions in
household units; it never gives nutrition numbers. Those come from the same
match-and-quantify pipeline as typed meals (``estimator.estimate_item``), so a
photo of dal, rice and two rotis gets INDB values just like the sentence
would. Every amount is marked as assumed so the review screen asks the user
to check it. The image is only held in memory for the request.
"""
import logging
from typing import List, Optional

from pydantic import BaseModel, Field

from app.ai import client as ai_client
from app.nutrition import estimator
from app.nutrition.estimator import MealEstimate
from app.nutrition.food_db import Food
from app.nutrition.parser import ParsedItem

logger = logging.getLogger(__name__)

MAX_DISHES = 12
PHOTO_NOTE = "Amount guessed from the photo. Check it before saving."


class PhotoDishes(BaseModel):
    """What the model saw on the plate."""

    is_food: bool = True
    dishes: List[ParsedItem] = Field(default_factory=list, max_length=MAX_DISHES)


_SYSTEM_PROMPT = (
    "You identify foods in meal photos taken by people in India. You never estimate calories "
    "or nutrients; you only name each dish and its rough amount in household units."
)

_INSTRUCTIONS = """Look at this meal photo and list each separately eaten food.

Rules:
- name: the dish in plain words, common Indian name preferred ("dal tadka", "jeera rice", "roti",
  "paneer butter masala", "curd"). No quantity in the name.
- quantity and unit: your best guess in household units: roti/paratha/idli/dosa/egg counts,
  katori or bowl for curries and dal, cup for rice, glass for drinks, piece, slice, tbsp.
  Use 0.5 for half. If you really can't tell, leave quantity null.
- preparation: only if visible (fried, grilled, with butter), else null.
- meal_type and eaten_at: null.
- List at most 12 foods. Ignore plates, cutlery and garnish.
- If the photo isn't food, set is_food to false and return no dishes."""


class PhotoNotFood(Exception):
    """The model saw no food in the photo."""


async def identify_dishes(image: bytes, mime_type: str, user_id: Optional[str]) -> List[ParsedItem]:
    """Ask the vision model which foods are in the photo.

    Raises:
        AIError: if no vision provider is available or the quota is used up.
        PhotoNotFood: if the photo doesn't show food.
    """
    result = await ai_client.generate_json_from_image(
        _INSTRUCTIONS, image, mime_type, PhotoDishes, system=_SYSTEM_PROMPT, user_id=user_id
    )
    if not result.is_food or not result.dishes:
        raise PhotoNotFood("No food found in the photo")
    return [d.model_copy(update={"meal_type": None, "eaten_at": None}) for d in result.dishes]


async def estimate_dishes(
    dishes: List[ParsedItem],
    user_id: Optional[str] = None,
    user_foods: Optional[List[Food]] = None,
) -> MealEstimate:
    """Resolve already-identified dishes through the normal match-and-quantify steps."""
    items = []
    for dish in dishes:
        for part in estimator.split_addons(dish):
            item = await estimator.estimate_item(part, user_id, user_foods)
            item.quantity_assumed = True
            item.note = item.note or PHOTO_NOTE
            items.append(item)
    return MealEstimate(
        text=", ".join(d.name for d in dishes),
        items=items,
        totals=estimator.totals(items),
        unresolved_count=sum(1 for i in items if i.source == "unresolved"),
    )
