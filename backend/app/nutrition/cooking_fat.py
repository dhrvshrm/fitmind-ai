"""How much oil, ghee or butter a planned dish assumes, in teaspoons.

Indian home cooking gets much of its calories from the fat in the pan, and
that's where portions drift. The dish ingredient file used for grocery lists
(``data/dish_ingredients.json``) lists the cooking fat per 100 g of dish, so
each plan item can say "about 1 tsp oil". The fat is already counted in the
dish's calories (INDB recipes include it); the note says what was assumed, so
someone pouring more knows what it costs.
"""
from typing import Dict, List

from app.nutrition import grocery

COOKING_FATS = ("oil", "ghee", "butter")
# Grams per level teaspoon; close enough for oil, ghee and soft butter.
GRAMS_PER_TSP = 5.0
TSP_STEP = 0.25
# kcal per teaspoon, for "each extra teaspoon adds about ...".
KCAL_PER_TSP = {"oil": 45, "ghee": 45, "butter": 36}


def _tsp(grams: float) -> float:
    return round(grams / GRAMS_PER_TSP / TSP_STEP) * TSP_STEP


def for_item(item: dict) -> List[Dict[str, float]]:
    """Cooking fats in one plan item: ``[{"kind", "grams", "tsp", "kcal_per_tsp"}]``.

    Empty when the dish isn't mapped, has no added fat, or uses under a
    quarter teaspoon. A plain fat (ghee itself) is the food, not a note.
    """
    parts = grocery.ingredients_for(item.get("food_id") or "") or []
    grams = float(item.get("grams") or 0)
    result = []
    for key, per_100g in parts:
        if key not in COOKING_FATS or not isinstance(per_100g, (int, float)):
            continue
        fat_grams = per_100g * grams / 100
        tsp = _tsp(fat_grams)
        if tsp <= 0:
            continue
        result.append({"kind": key, "grams": round(fat_grams, 1), "tsp": tsp,
                       "kcal_per_tsp": KCAL_PER_TSP[key]})
    return result


def annotate(meals: List[dict]) -> List[dict]:
    """Copies of the plan meals with ``cooking_fat`` on each item and a meal total in teaspoons."""
    annotated = []
    for meal in meals:
        items = [{**item, "cooking_fat": for_item(item)} for item in meal.get("items") or []]
        totals: Dict[str, float] = {}
        for item in items:
            for fat in item["cooking_fat"]:
                totals[fat["kind"]] = totals.get(fat["kind"], 0) + fat["grams"]
        meal_total = [{"kind": kind, "tsp": _tsp(grams)} for kind, grams in totals.items() if _tsp(grams) > 0]
        annotated.append({**meal, "items": items, "cooking_fat": meal_total})
    return annotated
