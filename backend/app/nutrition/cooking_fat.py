"""How much oil, ghee or butter a planned dish assumes, in teaspoons.

Indian home cooking gets much of its calories from the fat in the pan, and
that's where portions drift. The dish ingredient file used for grocery lists
(``data/dish_ingredients.json``) lists the cooking fat per 100 g of dish, so
each plan item can say "about 1 tsp oil". The fat is already counted in the
dish's calories (INDB recipes include it); the note says what was assumed, so
someone pouring more knows what it costs.
"""
import re
from typing import Dict, List

from app.nutrition import grocery

COOKING_FATS = ("oil", "ghee", "butter")
# Grams per level teaspoon; close enough for oil, ghee and soft butter.
GRAMS_PER_TSP = 5.0
TSP_STEP = 0.25
# kcal per teaspoon, for "each extra teaspoon adds about ...".
KCAL_PER_TSP = {"oil": 45, "ghee": 45, "butter": 36}

# Dishes without an ingredient mapping: a cooked, savoury vegetable, dal or
# grain dish gets nearly all of its fat from the pan, so the oil is estimated
# as its fat minus what the dal, grains and vegetables carry themselves.
# Dishes whose main ingredients are rich in fat (paneer, meat, nuts, coconut,
# soya) or that are sweets are skipped, since their own fat can't be told apart.
COOKED_DISH = re.compile(
    r"\b(curry|sabzi|subzi|dal|daal|masala|fry|bhaji|bhujia|korma|kadhi|sambar|sambhar|pulao|biryani|"
    r"khichdi|upma|poha|paratha|parantha|bharta|thoran|poriyal|kootu|rajma|chole|chana|channa|aloo|"
    r"bhindi|baingan|gobi|palak|methi|kofta|tikki|chilla|cheela|dosa|uttapam)\b",
    re.IGNORECASE,
)
RICH_OR_SWEET = re.compile(
    r"paneer|chicken|mutton|lamb|fish|prawn|egg|cheese|nut|cashew|kaju|almond|badam|pista|coconut|cream|malai|butter|ghee|"
    r"keema|meat|peanut|groundnut|khoya|mawa|\btil\b|sesame|soya|\bsoy|burfi|barfi|ladoo|laddu|halwa|kheer|"
    r"biscuit|cake|sweet|chikki",
    re.IGNORECASE,
)
# Fat (g per 100 g of dish) the dal, grains and vegetables bring themselves.
BASE_FAT_PER_100G = 1.0


def _tsp(grams: float) -> float:
    return round(grams / GRAMS_PER_TSP / TSP_STEP) * TSP_STEP


def _estimate(item: dict, grams: float) -> List[dict]:
    """Oil for an unmapped cooked dish, from its fat (marked as an estimate)."""
    food_id = item.get("food_id") or ""
    name = item.get("name") or ""
    if not food_id.startswith("indb:") or not COOKED_DISH.search(name) or RICH_OR_SWEET.search(name):
        return []
    fat_per_100g = float((item.get("per_100g") or {}).get("fat") or 0)
    oil = max(0.0, fat_per_100g - BASE_FAT_PER_100G) * grams / 100
    tsp = _tsp(oil)
    if tsp <= 0:
        return []
    return [{"kind": "oil", "grams": round(oil, 1), "tsp": tsp, "kcal_per_tsp": KCAL_PER_TSP["oil"],
             "estimated": True}]


def for_item(item: dict) -> List[Dict[str, float]]:
    """Cooking fats in one plan item: ``[{"kind", "grams", "tsp", "kcal_per_tsp", "estimated"}]``.

    From the dish's ingredient mapping when there is one, otherwise estimated
    for cooked savoury dishes (``estimated``: true). Empty when there's no
    added fat or under a quarter teaspoon. A plain fat (ghee itself) is the
    food, not a note.
    """
    parts = grocery.ingredients_for(item.get("food_id") or "")
    grams = float(item.get("grams") or 0)
    if parts is None:
        return _estimate(item, grams)
    result = []
    for key, per_100g in parts:
        if key not in COOKING_FATS or not isinstance(per_100g, (int, float)):
            continue
        fat_grams = per_100g * grams / 100
        tsp = _tsp(fat_grams)
        if tsp <= 0:
            continue
        result.append({"kind": key, "grams": round(fat_grams, 1), "tsp": tsp,
                       "kcal_per_tsp": KCAL_PER_TSP[key], "estimated": False})
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
        estimated = any(fat["estimated"] for item in items for fat in item["cooking_fat"])
        meal_total = [{"kind": kind, "tsp": _tsp(grams), "estimated": estimated}
                      for kind, grams in totals.items() if _tsp(grams) > 0]
        annotated.append({**meal, "items": items, "cooking_fat": meal_total})
    return annotated
