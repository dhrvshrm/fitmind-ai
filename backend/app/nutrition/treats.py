"""Healthy treats: a lighter version of whatever someone is craving.

Each treat is a few foods from the food database with their grams, so its
numbers are worked out like any logged meal. Choosing one is never a block:
the options respect diet type, allergies and dislikes (DietRules) and the
health profile, and once a treat is logged the rest of the day's plan shrinks
to make room (day_sync portion hints).
"""
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from pydantic import BaseModel

from app.nutrition import food_db
from app.nutrition.diet_rules import DietRules
from app.nutrition.food_db import Food, Nutrients, Serving

DATA_FILE = Path(__file__).parent / "data" / "treats.json"

# Treats a week we suggest; more is fine, the app just says so.
TREATS_PER_WEEK = 2
# Flags (from health_profile_service.health_flags) that leave sugary treats out.
BLOOD_SUGAR_FLAGS = frozenset({"diabetes", "pcos", "blood_sugar_high"})
# Flags that add a salt tip to salty treats.
BLOOD_PRESSURE_FLAGS = frozenset({"hypertension", "bp_medication", "kidney"})

TAG_SUGAR = "sugar"
TAG_SALT = "salt"
TIP_SALT = "salt"


class TreatItem(BaseModel):
    food_id: str
    grams: float
    label: str
    quantity: float
    unit: str


class Treat(BaseModel):
    id: str
    craving: str
    name: str
    instead_of: str
    why: str
    tags: List[str] = []
    # Ingredients the dish names don't show (onion in a bhaji), checked by diet rules.
    contains: List[str] = []
    items: List[TreatItem]


class TreatCatalog(BaseModel):
    cravings: List[str]
    treats: List[Treat]


@lru_cache(maxsize=1)
def catalog() -> TreatCatalog:
    """The treats, checked once: known cravings and foods that exist.

    Raises:
        ValueError: when a treat names an unknown craving or food.
    """
    raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    data = TreatCatalog(cravings=raw["cravings"], treats=raw["treats"])
    for treat in data.treats:
        if treat.craving not in data.cravings:
            raise ValueError(f"Treat {treat.id} has an unknown craving {treat.craving}")
        for item in treat.items:
            if food_db.get_food(item.food_id) is None:
                raise ValueError(f"Treat {treat.id} uses an unknown food {item.food_id}")
    return data


def cravings() -> List[str]:
    return list(catalog().cravings)


def get_treat(treat_id: str) -> Optional[Treat]:
    return next((t for t in catalog().treats if t.id == treat_id), None)


def _foods(treat: Treat) -> List[Food]:
    return [food_db.get_food(item.food_id) for item in treat.items]


def meal_items(treat: Treat) -> List[Dict[str, Any]]:
    """The treat as logged meal items, with nutrients from the database."""
    items = []
    for item, food in zip(treat.items, _foods(treat)):
        nutrients = food.per_100g.scaled(item.grams / 100)
        items.append({
            "name": item.label,
            "food_id": food.id,
            "source": food.source,
            "verified": True,
            "quantity": item.quantity,
            "unit": item.unit,
            "grams": item.grams,
            "nutrients": nutrients.model_dump(),
        })
    return items


def totals(treat: Treat) -> Nutrients:
    total = Nutrients()
    for item in meal_items(treat):
        total = total.plus(Nutrients(**item["nutrients"]))
    return total


def allowed(treat: Treat, rules: DietRules, flags: Set[str]) -> bool:
    """Whether a treat suits the person's diet, allergies and health."""
    if TAG_SUGAR in treat.tags and BLOOD_SUGAR_FLAGS & flags:
        return False
    # The dish as a whole, with its hidden ingredients, plus each of its foods.
    dish = Food(
        id=f"treat:{treat.id}", name=treat.name, full_name=" ".join(treat.contains),
        source="treat", per_100g=Nutrients(), serving=Serving(unit="serving", grams=100),
    )
    return all(rules.allows(food) for food in [dish, *_foods(treat)])


def tips(treat: Treat, flags: Set[str]) -> List[str]:
    """Short tip codes shown with a treat (the screen words them)."""
    return [TIP_SALT] if TAG_SALT in treat.tags and BLOOD_PRESSURE_FLAGS & flags else []


def view(treat: Treat, flags: Set[str]) -> Dict[str, Any]:
    """What the treat screen shows for one option."""
    total = totals(treat)
    return {
        "id": treat.id,
        "craving": treat.craving,
        "name": treat.name,
        "instead_of": treat.instead_of,
        "why": treat.why,
        "tips": tips(treat, flags),
        "items": meal_items(treat),
        "nutrients": total.model_dump(),
    }


def options(craving: str, rules: DietRules, flags: Set[str]) -> List[Dict[str, Any]]:
    """Every treat for a craving this person can have, lightest first."""
    picks = [t for t in catalog().treats if t.craving == craving and allowed(t, rules, flags)]
    picks.sort(key=lambda t: totals(t).kcal)
    return [view(t, flags) for t in picks]
