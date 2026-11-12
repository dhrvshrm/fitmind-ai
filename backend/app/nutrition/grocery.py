"""A grocery list from a meal plan: dishes turned into ingredients, grouped by aisle.

Plan items are dishes ("Chickpeas curry"), so a curated file
(``data/dish_ingredients.json``) maps the dishes the planner picks most to
their main ingredients per 100 g of the dish. Plain foods (curd, bananas)
map to themselves. A dish without a mapping is listed honestly under
"ready-made / other" with its servings, never guessed.

Amounts are rounded up to amounts people actually buy (25 g steps, half a
kilo, whole pieces), so the list is a shopping guide, not a recipe.
"""
import json
import math
from collections import OrderedDict
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

DATA_FILE = Path(__file__).parent / "data" / "dish_ingredients.json"

AISLES = (
    "vegetables",
    "fruits",
    "grains_flours",
    "pulses",
    "dairy",
    "meat_fish_eggs",
    "spices_others",
    "ready_made",
)
READY_MADE = "ready_made"
DEFAULT_DAYS = 7
MAX_DAYS = 14


@lru_cache(maxsize=1)
def _data() -> dict:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def ingredients_for(food_id: str) -> Optional[List[list]]:
    """``[[ingredient key, amount per 100 g of dish], ...]`` or None when not mapped."""
    return _data()["dishes"].get(food_id)


def _round_up(value: float, step: float) -> float:
    return math.ceil(value / step - 1e-9) * step


def household_amount(amount: float, unit: Optional[str]) -> Dict[str, Optional[float]]:
    """A shopping amount: grams up to a kilo then kilos, ml then litres, whole pieces."""
    if unit is None or amount <= 0:
        return {"amount": None, "unit": None}
    if unit == "piece":
        return {"amount": max(1, math.ceil(amount - 0.05)), "unit": "piece"}
    big = "kg" if unit == "g" else "l"
    if amount >= 1000:
        return {"amount": round(_round_up(amount / 1000, 0.1), 1), "unit": big}
    step = 5 if amount < 50 else 25 if amount < 500 else 50
    return {"amount": int(_round_up(amount, step)), "unit": unit}


def build_list(meals: List[dict], days: int = DEFAULT_DAYS) -> dict:
    """Combine the plan's dishes over ``days`` days into one list grouped by aisle.

    ``meals`` are plan meals (each item has ``food_id``, ``name``, ``grams``,
    ``quantity`` and ``unit``). The plan is one day, repeated for ``days``.

    Returns ``{"days", "aisles": [{"aisle", "items": [...]}], "unmapped_count"}``.
    Each ingredient item: ``{"key", "name", "aisle", "amount", "unit", "dishes"}``
    (``amount``/``unit`` are None for spices and herbs). Ready-made items carry
    ``servings``, ``serving_unit`` and ``grams`` instead of a converted amount.
    """
    data = _data()
    ingredients = data["ingredients"]
    totals: Dict[str, float] = {}
    used_in: Dict[str, "OrderedDict[str, None]"] = {}
    ready: Dict[str, dict] = {}
    for meal in meals:
        for item in meal.get("items", []):
            grams = float(item.get("grams") or 0) * days
            parts = data["dishes"].get(item.get("food_id") or "")
            if parts is None:
                entry = ready.setdefault(item.get("food_id") or item["name"], {
                    "key": item.get("food_id") or item["name"],
                    "name": item["name"],
                    "aisle": READY_MADE,
                    "servings": 0.0,
                    "serving_unit": item.get("unit"),
                    "grams": 0.0,
                    "dishes": [item["name"]],
                })
                entry["servings"] += float(item.get("quantity") or 0) * days
                entry["grams"] += grams
                continue
            for key, per_100g in parts:
                totals[key] = totals.get(key, 0.0) + grams / 100 * per_100g
                used_in.setdefault(key, OrderedDict())[item["name"]] = None
    by_aisle: Dict[str, List[dict]] = {aisle: [] for aisle in AISLES}
    for key, amount in totals.items():
        spec = ingredients[key]
        by_aisle[spec["aisle"]].append({
            "key": key,
            "name": spec["name"],
            "aisle": spec["aisle"],
            **household_amount(amount, spec["unit"]),
            "dishes": list(used_in[key]),
        })
    for entry in ready.values():
        entry["servings"] = round(entry["servings"], 1)
        entry["grams"] = round(entry["grams"])
        by_aisle[READY_MADE].append(entry)
    aisles = [
        {"aisle": aisle, "items": sorted(items, key=lambda i: i["name"].lower())}
        for aisle, items in by_aisle.items()
        if items
    ]
    return {"days": days, "aisles": aisles, "unmapped_count": len(ready)}
