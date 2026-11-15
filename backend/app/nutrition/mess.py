"""PG and hostel mess mode: the mess serves the main meals, a small shelf does the rest.

Students and working people in PGs eat what the mess serves at breakfast,
lunch and dinner, and keep a few things that need no cooking (milk, bread,
peanut butter, dates, dry fruits, roasted chana, sattu). In mess mode:

- the mess meals are an average mess plate (whatever sabzi is cooked, and
  chapati, which is always there), so the day adds up and the plan can say
  "take one more roti"; what was really served is logged and the day adjusts;
- every other meal (before training, the college or office snack, before bed)
  uses only foods on the person's shelf, never anything that needs a kitchen;
- each shelf food carries a rough price, so the day's extras have a cost.

Prices are rough Indian city averages (late 2026), shown as estimates.
"""
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence

from app.nutrition import food_db
from app.nutrition.diet_rules import DietRules
from app.nutrition.food_db import Food

MESS_SLOTS = ("breakfast", "lunch", "dinner")


@dataclass(frozen=True)
class ShelfItem:
    key: str
    food_id: str
    # Rough price of one serving of the food's unit, in rupees.
    price_inr: float


# What people in a PG keep that needs no cooking. Keys are what the app stores.
SHELF: Dict[str, ShelfItem] = {item.key: item for item in (
    ShelfItem("milk", "usda:171267", 15),              # toned milk, 250 ml glass (about ₹60 a litre)
    ShelfItem("curd", "usda:171284", 15),               # 150 g bowl
    ShelfItem("banana", "usda:173944", 6),
    ShelfItem("dates", "est:dates", 3),                 # one date
    ShelfItem("almonds", "usda:170567", 1.2),           # one almond
    ShelfItem("peanuts", "usda:173806", 2.5),           # 15 g tablespoon of roasted peanuts
    ShelfItem("peanut_butter", "usda:172470", 6),       # 16 g tablespoon
    ShelfItem("brown_bread", "usda:172688", 3.5),       # one slice
    ShelfItem("roasted_chana", "est:roasted_chana", 5), # 40 g bowl (about ₹120 a kg)
    ShelfItem("sattu", "est:sattu_drink", 4),           # 40 g sattu in a glass of water
    ShelfItem("eggs", "usda:173424", 8),                # boiled, from a shop or a kettle
    ShelfItem("paneer", "est:paneer", 45),              # 100 g
    ShelfItem("oats", "usda:173904", 6),                # 40 g, soaked overnight in milk or curd
    ShelfItem("apple", "usda:171688", 20),
    ShelfItem("whey", "est:whey_protein", 60),          # one scoop
    ShelfItem("butter", "usda:173410", 3),              # one teaspoon
    ShelfItem("coffee", "indb:ASC002", 5),              # a cup of instant coffee with milk
)}

# Where each shelf food fits in a day, best first. Every food on the shelf is
# used at least once (see use_whole_shelf), in the main meals too.
SHELF_PLACES: Dict[str, List[str]] = {
    "dates": ["pre_workout", "evening_snack", "mid_morning", "breakfast"],
    "banana": ["pre_workout", "mid_morning", "evening_snack", "breakfast"],
    "apple": ["mid_morning", "evening_snack", "pre_workout"],
    # Before training first: the mess breakfast already comes with tea.
    "coffee": ["pre_workout", "mid_morning", "breakfast"],
    "milk": ["breakfast", "bedtime", "evening_snack"],
    "curd": ["lunch", "dinner", "breakfast"],
    "brown_bread": ["breakfast", "evening_snack", "mid_morning"],
    "peanut_butter": ["breakfast", "evening_snack", "mid_morning"],
    "butter": ["breakfast", "evening_snack"],
    "roasted_chana": ["evening_snack", "mid_morning", "lunch", "bedtime"],
    "peanuts": ["evening_snack", "mid_morning", "lunch"],
    "almonds": ["breakfast", "evening_snack", "mid_morning"],
    "sattu": ["evening_snack", "mid_morning", "breakfast"],
    "eggs": ["breakfast", "evening_snack", "dinner"],
    "paneer": ["dinner", "lunch"],
    "oats": ["breakfast", "bedtime"],
    "whey": ["breakfast", "evening_snack"],
}
PLACE_SERVINGS: Dict[str, float] = {"dates": 3, "almonds": 8, "brown_bread": 2, "eggs": 2}
# A shelf food is only added where it keeps the day within these.
MAX_KCAL_SHARE = 1.04
MAX_FAT_SHARE = 1.25
MAX_ITEMS_PER_MEAL = 6

# What the mess serves. Nobody knows the day's menu in advance, so the plate is
# an average: whatever sabzi is cooked plus chapati, which is always there (and
# refilled). Breakfast is an average of poha, upma and paratha. Whatever was
# really served (dal, rice, curd) is logged, and the rest of the day adjusts.
# (food id, servings) per meal; the list allows more than one plate later.
MESS_PLATES: Dict[str, List[List[tuple]]] = {
    "breakfast": [[("est:mess_breakfast", 1), ("indb:ASC001", 1)]],   # mess breakfast, tea
    "lunch": [[("est:mess_sabzi", 1), ("indb:ASC096", 4)]],           # sabzi, chapati
    "dinner": [[("est:mess_sabzi", 1), ("indb:ASC096", 4)]],          # sabzi, chapati
}


# Messes refill chapati and rice; the side dish and breakfast come as one serving.
REFILLABLE_IDS = frozenset({"indb:ASC096", "indb:ASC113"})  # chapati, boiled rice


def refillable(food: Food) -> bool:
    return food.id in REFILLABLE_IDS


def is_on(food_access: Optional[dict]) -> bool:
    """Mess mode is on when the person says the mess serves at least one meal."""
    return bool((food_access or {}).get("mess_meals"))


def mess_meals(food_access: Optional[dict]) -> List[str]:
    return [m for m in (food_access or {}).get("mess_meals") or [] if m in MESS_SLOTS]


def _food(food_id: str) -> Optional[Food]:
    return food_db.get_food(food_id)


def shelf_foods(food_access: Optional[dict], rules: DietRules) -> List[Food]:
    """The person's shelf as foods their diet allows (vegan: no milk or whey)."""
    keys = (food_access or {}).get("shelf") or []
    foods = []
    for key in keys:
        item = SHELF.get(key)
        food = _food(item.food_id) if item else None
        if food is not None and rules.allows(food):
            foods.append(food)
    return foods


def key_of(food_id: str) -> Optional[str]:
    return next((i.key for i in SHELF.values() if i.food_id == food_id), None)


def use_whole_shelf(meals: List[dict], shelf: Sequence[Food], foods: Dict[str, Food], targets: dict) -> int:
    """Put every shelf food the day doesn't use yet into a meal it suits (in place).

    Someone who keeps peanuts, chana and coffee should see all of them in
    their day, in the main meals too (chana with lunch). A food goes where it
    fits best; if that would push calories or fat too far, the next place is
    tried. Returns how many were placed.
    """
    import copy

    from app.nutrition import meal_planner

    placed = 0
    for food in shelf:
        if any(i["food_id"] == food.id for m in meals for i in m["items"]):
            continue
        key = key_of(food.id) or ""
        for slot_id in SHELF_PLACES.get(key, ["evening_snack", "breakfast"]):
            meal = next((m for m in meals if m["id"] == slot_id), None)
            if meal is None or len(meal["items"]) >= MAX_ITEMS_PER_MEAL or not meal_planner.suits_meal(food, meal):
                continue
            before = {k: sum(i["nutrients"][k] for m in meals for i in m["items"]) for k in ("kcal", "fat")}
            backup = copy.deepcopy(meals)
            foods[food.id] = food
            meal["items"].append(meal_planner.build_item(food, meal_planner.snap(food, PLACE_SERVINGS.get(key, 1))))
            meal_planner.fit_portions(meals, targets, foods)
            after = {k: sum(i["nutrients"][k] for m in meals for i in m["items"]) for k in ("kcal", "fat")}
            if (after["kcal"] <= targets["calories"] * MAX_KCAL_SHARE
                    and after["fat"] <= max(before["fat"], targets["fats"] * MAX_FAT_SHARE)):
                placed += 1
                break
            meals[:] = backup
    return placed


def price_of(food_id: str) -> Optional[float]:
    return next((i.price_inr for i in SHELF.values() if i.food_id == food_id), None)


def item_cost(item: dict) -> Optional[float]:
    """Rough cost of one plan item from the shelf, or None for mess food."""
    price = price_of(item["food_id"])
    return None if price is None else round(price * float(item.get("quantity") or 0), 1)


def mess_plate(slot_id: str, variant: int, rules: DietRules) -> List[tuple]:
    """Today's typical mess plate for a meal: (food, servings) the diet allows."""
    plates = MESS_PLATES.get(slot_id) or []
    if not plates:
        return []
    plate = plates[variant % len(plates)]
    result = []
    for food_id, servings in plate:
        food = _food(food_id)
        if food is not None and rules.allows(food):
            result.append((food, servings))
    return result


# Starting points for the shelf meals, as everyday pairings with servings
# (three dates before training, bread with peanut butter); the first one the
# shelf can make is used, and protein is topped up afterwards.
SHELF_COMBOS: Dict[str, List[List[tuple]]] = {
    "pre_workout": [[("dates", 3)], [("banana", 1)], [("apple", 1)]],
    "breakfast": [[("brown_bread", 2), ("peanut_butter", 1), ("milk", 1)], [("oats", 1), ("milk", 1)],
                  [("brown_bread", 2), ("eggs", 2)], [("banana", 2), ("milk", 1)]],
    "mid_morning": [[("roasted_chana", 1)], [("brown_bread", 2), ("peanut_butter", 1)], [("sattu", 1)],
                    [("peanuts", 2), ("banana", 1)], [("almonds", 10), ("dates", 2)], [("banana", 1)]],
    "evening_snack": [[("roasted_chana", 1)], [("brown_bread", 2), ("peanut_butter", 1)], [("sattu", 1)],
                      [("peanuts", 2), ("banana", 1)], [("almonds", 10), ("dates", 2)], [("banana", 1)]],
    "lunch": [[("brown_bread", 3), ("peanut_butter", 1), ("curd", 1)], [("brown_bread", 3), ("eggs", 2)]],
    "dinner": [[("brown_bread", 3), ("peanut_butter", 1), ("curd", 1)], [("brown_bread", 3), ("eggs", 2)]],
    "bedtime": [[("milk", 1)], [("curd", 1)]],
    "post_iftar": [[("milk", 1), ("dates", 2)]],
}


def shelf_combo(slot_id: str, shelf: Sequence[Food]) -> List[tuple]:
    """The first everyday pairing the shelf can make for this meal: [(food, servings)]."""
    by_id = {f.id: f for f in shelf}
    for combo in SHELF_COMBOS.get(slot_id, SHELF_COMBOS["evening_snack"]):
        ids = [SHELF[key].food_id for key, _ in combo]
        if all(i in by_id for i in ids):
            return [(by_id[i], servings) for i, (_, servings) in zip(ids, combo)]
    return []


# Cheap foods worth suggesting when the shelf can't close the protein gap.
CHEAP_PROTEIN = ("roasted_chana", "sattu", "eggs", "milk", "peanuts", "curd")


def shelf_suggestion(food_access: Optional[dict], rules: DietRules) -> Optional[dict]:
    """The cheapest protein food the person doesn't keep yet, for a note."""
    owned = set((food_access or {}).get("shelf") or [])
    for key in CHEAP_PROTEIN:
        if key in owned:
            continue
        item = SHELF[key]
        food = _food(item.food_id)
        if food is None or not rules.allows(food):
            continue
        protein = food.per_100g.scaled(food.serving.grams / 100).protein
        return {"key": key, "name": food.name, "price_inr": item.price_inr, "protein_g": round(protein, 1)}
    return None
