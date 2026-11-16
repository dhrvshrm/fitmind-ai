"""The supplements a person takes, as part of their meal plan.

A scoop of whey is food: it goes into the meal it is taken with, as a fixed
item, so portions around it shrink and protein isn't counted twice. Creatine,
vitamins and minerals carry no calories; they are listed on that meal so the
day shows everything taken.
"""
from typing import Dict, List, Optional

SUPPLEMENT_SOURCE = "supplement"
FOOD_ID_PREFIX = "supplement:"

# Each timing's best plan meals, in order (the first one the plan has wins).
TIMING_SLOTS: Dict[str, List[str]] = {
    "pre_workout": ["pre_workout", "evening_snack", "mid_morning"],
    "morning": ["breakfast", "sehri", "mid_morning"],
    "with_breakfast": ["breakfast", "sehri"],
    "with_lunch": ["lunch"],
    "with_dinner": ["dinner", "iftar"],
    "evening": ["evening_snack", "dinner", "post_iftar"],
    "bedtime": ["bedtime", "dinner", "post_iftar"],
    "any": ["breakfast", "lunch", "dinner"],
}


def slot_for(supplement: dict, meals: List[dict]) -> Optional[str]:
    """The plan meal a supplement belongs with (after training: the post-workout meal)."""
    ids = [m["id"] for m in meals]
    timing = supplement.get("timing") or "any"
    if timing == "post_workout":
        post = next((m["id"] for m in meals if m.get("workout_role") == "post"), None)
        if post:
            return post
        return next((s for s in ("breakfast", "lunch", "dinner") if s in ids), ids[0] if ids else None)
    for slot in TIMING_SLOTS.get(timing, TIMING_SLOTS["any"]):
        if slot in ids:
            return slot
    return ids[0] if ids else None


def plan_item(supplement: dict) -> dict:
    """A supplement with calories as a fixed plan item (the fitter never resizes it)."""
    macros = supplement["macros_per_serving"]
    nutrients = {
        "kcal": float(macros.get("calories") or 0), "protein": float(macros.get("protein") or 0),
        "carbs": float(macros.get("carbs") or 0), "fat": float(macros.get("fats") or 0), "fiber": 0.0,
    }
    return {
        "food_id": FOOD_ID_PREFIX + supplement["id"],
        "user_supplement_id": supplement["id"],
        "name": supplement["name"],
        "source": SUPPLEMENT_SOURCE,
        "verified": False,
        "quantity": 1,
        "unit": supplement.get("dose") or "serving",
        "grams": 0,
        "nutrients": nutrients,
        "per_100g": nutrients,
    }


def is_supplement_item(item: dict) -> bool:
    return item.get("source") == SUPPLEMENT_SOURCE


def add_to_meals(meals: List[dict], supplements: List[dict], only: Optional[List[str]] = None) -> None:
    """Put each supplement into its meal (in place): calorie ones as items, the rest listed.

    ``only`` limits it to those meal ids (a regenerated meal gets its own back).
    """
    for meal in meals:
        if only is None or meal["id"] in only:
            meal["items"] = [i for i in meal["items"] if not is_supplement_item(i)]
            meal["supplements"] = []
    for supplement in supplements:
        slot = slot_for(supplement, meals)
        if slot is None or (only is not None and slot not in only):
            continue
        meal = next(m for m in meals if m["id"] == slot)
        if supplement.get("macros_per_serving"):
            meal["items"].append(plan_item(supplement))
        else:
            meal["supplements"].append({"id": supplement["id"], "name": supplement["name"],
                                        "dose": supplement.get("dose") or ""})


def signature(supplements: List[dict]) -> List[str]:
    """What a plan was made with: which supplements, and which carry calories (for staleness)."""
    return sorted(f"{s['id']}:{1 if s.get('macros_per_serving') else 0}:{s.get('timing') or 'any'}"
                  for s in supplements)


def mark_taken(meals: List[dict], taken_ids: set) -> List[dict]:
    """Flag supplements (items and calorie-free ones) already taken today, without touching the stored plan."""
    out = []
    for meal in meals:
        meal = {**meal}
        meal["items"] = [
            {**i, "taken_today": i.get("user_supplement_id") in taken_ids} if is_supplement_item(i) else i
            for i in meal.get("items", [])
        ]
        if meal.get("supplements"):
            meal["supplements"] = [{**x, "taken_today": x["id"] in taken_ids} for x in meal["supplements"]]
        out.append(meal)
    return out
