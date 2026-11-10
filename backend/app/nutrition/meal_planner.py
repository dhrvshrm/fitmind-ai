"""One day of meals that fits a person's targets, diet and routine.

The split of work:
1. Code decides the meal slots, their times and calorie shares, and the
   foods allowed (diet type, allergies, exclusions; see ``diet_rules``).
2. The AI only chooses dishes from that list, by id, with rough portions.
   Ids outside the list fail validation and the AI is asked again, so a
   forbidden or made-up food can't get through.
3. Every number is then recomputed from the food database, and portions
   are nudged in sensible steps (half a bowl, one roti) until the day is
   close to the calorie target with as much of the protein target as the
   chosen foods allow.
"""
import logging
from typing import Dict, List, Optional, Sequence, Tuple, Type

from pydantic import BaseModel, Field, model_validator

from app.ai import client as ai_client
from app.nutrition import food_db
from app.nutrition.diet_rules import DietRules, STAPLE_WORDS, food_tokens, suitable_for_plans
from app.nutrition.food_db import Food, Nutrients
from app.nutrition.text import normalize, tokens
from app.nutrition.units import is_piece_unit

logger = logging.getLogger(__name__)

# --- Meal slots --------------------------------------------------------------
# key -> (meal type used when logging, default time, share of the day's calories)
SLOTS: Dict[str, Tuple[str, str, float]] = {
    "breakfast": ("breakfast", "08:30", 0.25),
    "mid_morning": ("snack", "11:00", 0.08),
    "lunch": ("lunch", "13:30", 0.32),
    "evening_snack": ("snack", "17:00", 0.10),
    "dinner": ("dinner", "20:30", 0.28),
    "bedtime": ("snack", "22:00", 0.07),
}
SLOTS_BY_MEAL_COUNT: Dict[int, List[str]] = {
    2: ["lunch", "dinner"],
    3: ["breakfast", "lunch", "dinner"],
    4: ["breakfast", "lunch", "evening_snack", "dinner"],
    5: ["breakfast", "mid_morning", "lunch", "evening_snack", "dinner"],
    6: ["breakfast", "mid_morning", "lunch", "evening_snack", "dinner", "bedtime"],
}
DEFAULT_MEAL_COUNT = 4
SNACK_SLOTS = {"mid_morning", "evening_snack", "bedtime"}


def _minutes(hhmm: str) -> int:
    hours, minutes = hhmm.split(":")
    return int(hours) * 60 + int(minutes)


def _hhmm(total: int) -> str:
    total %= 24 * 60
    return f"{total // 60:02d}:{total % 60:02d}"


def plan_slots(lifestyle: Optional[dict]) -> List[dict]:
    """The day's meals with times and calorie shares, from the person's routine."""
    lifestyle = lifestyle or {}
    count = min(max(lifestyle.get("meals_per_day") or DEFAULT_MEAL_COUNT, 2), 6)
    keys = SLOTS_BY_MEAL_COUNT[count]
    times = {key: SLOTS[key][1] for key in keys}
    wake, sleep = lifestyle.get("wake_time"), lifestyle.get("sleep_time")
    # Day schedules only; shift workers keep the defaults, which they can follow loosely.
    if wake and 4 * 60 <= _minutes(wake) <= 11 * 60 and "breakfast" in times:
        times["breakfast"] = _hhmm(_minutes(wake) + 60)
        if "mid_morning" in times:
            times["mid_morning"] = _hhmm(max(_minutes(wake) + 180, _minutes(times["breakfast"]) + 120))
    if sleep and (_minutes(sleep) >= 21 * 60 or _minutes(sleep) <= 2 * 60):
        bed = _minutes(sleep) + (24 * 60 if _minutes(sleep) <= 2 * 60 else 0)
        times["dinner"] = _hhmm(min(bed - 150, 21 * 60 + 30))
        if "bedtime" in times:
            times["bedtime"] = _hhmm(bed - 60)
    total_share = sum(SLOTS[key][2] for key in keys)
    return [
        {
            "id": key,
            "meal_type": SLOTS[key][0],
            "time": times[key],
            "share": round(SLOTS[key][2] / total_share, 3),
        }
        for key in keys
    ]


# --- Food list offered to the AI --------------------------------------------
POOL_LIMIT = 220
# The dishes people mean by "dal", "roti", "poha"... and plain staples (curd, milk, fruit, eggs).
CORE_FOOD_IDS = frozenset(food_db.GENERIC_ALIASES.values())
CORE_SOURCES = frozenset({"USDA"})


def food_pool(rules: DietRules, prefs: Optional[dict], user_foods: Sequence[Food] = ()) -> List[Food]:
    """Foods the person can be offered, best first, trimmed to ``POOL_LIMIT``.

    Order: their own foods, then core staples, then dishes matching their
    likes and cuisines, then other everyday dishes, simpler (shorter) names first.
    """
    prefs = prefs or {}
    liked = set()
    for term in (prefs.get("likes") or []) + (prefs.get("cuisines") or []):
        liked |= tokens(term)
    own = [f for f in user_foods if rules.allows(f)]
    scored = []
    for entry in food_db._index():
        food = entry.food
        if not suitable_for_plans(food) or not rules.allows(food):
            continue
        found = food_tokens(food)
        score = (
            (3 if food.id in CORE_FOOD_IDS or food.source in CORE_SOURCES else 0)
            + (2 if found & liked else 0)
            + (1 if found & STAPLE_WORDS else 0)
        )
        scored.append((-score, len(food.name), food.id, food))
    scored.sort(key=lambda s: s[:3])
    return own + [s[3] for s in scored[: max(POOL_LIMIT - len(own), 0)]]


def _serving_line(food: Food) -> str:
    per = food.per_100g.scaled(food.serving.grams / 100)
    return (
        f"{food.id} | {food.name} | 1 {food.serving.unit} {food.serving.grams:.0f} g | "
        f"{per.kcal:.0f} kcal {per.protein:.0f} g protein"
    )


# --- AI selection ------------------------------------------------------------
class PickedItem(BaseModel):
    food_id: str
    servings: float = Field(..., gt=0, le=20)


class PickedMeal(BaseModel):
    slot: str
    items: List[PickedItem] = Field(..., min_length=1, max_length=6)


class PlanPick(BaseModel):
    meals: List[PickedMeal] = Field(..., min_length=1)


def pick_schema(allowed_ids: set, slots: Sequence[str]) -> Type[PlanPick]:
    """A PlanPick that only accepts the given foods and exactly the given slots."""

    class ConstrainedPlanPick(PlanPick):
        @model_validator(mode="after")
        def _only_listed(self) -> "ConstrainedPlanPick":
            unknown = sorted({i.food_id for m in self.meals for i in m.items} - allowed_ids)
            if unknown:
                raise ValueError(f"food_id not in the list: {', '.join(unknown[:5])}. Use only listed ids")
            got = [m.slot for m in self.meals]
            if sorted(got) != sorted(slots):
                raise ValueError(f"meals must be exactly these slots, once each: {', '.join(slots)}")
            return self

    return ConstrainedPlanPick


SYSTEM_PROMPT = (
    "You are a dietitian in India building practical home-style meal plans. You choose dishes "
    "only from the food list you are given and refer to them by id. You plan normal Indian "
    "meals that a family would actually cook or a mess would serve."
)

DIET_LABELS = {
    "vegetarian": "vegetarian",
    "eggetarian": "vegetarian, eats eggs",
    "non_vegetarian": "non-vegetarian",
    "vegan": "vegan",
    "jain": "Jain (no onion, garlic or root vegetables)",
}
COOK_HINTS = {
    "self": "They cook for themselves, so keep dishes simple and quick.",
    "family": "Family cooks, so regular home dishes are fine.",
    "cook": "A cook prepares meals, so regular home dishes are fine.",
    "mess_or_canteen": "They eat at a mess or canteen, so stick to common mess dishes (dal, rice, roti, sabzi, curd).",
    "mixed": "They sometimes cook and sometimes eat out, so keep dishes common.",
}


def _profile_lines(prefs: dict, access: dict) -> List[str]:
    lines = []
    diet = DIET_LABELS.get(prefs.get("diet_type") or "")
    if diet:
        lines.append(f"Diet: {diet}.")
    for label, key in (("Likes", "likes"), ("Cuisines", "cuisines")):
        if prefs.get(key):
            lines.append(f"{label}: {', '.join(prefs[key])}.")
    if access.get("region"):
        lines.append(f"Region: {access['region']}.")
    if access.get("pantry"):
        lines.append(f"Usually has at home: {', '.join(access['pantry'])}.")
    if access.get("who_cooks") in COOK_HINTS:
        lines.append(COOK_HINTS[access["who_cooks"]])
    if access.get("daily_budget_inr"):
        lines.append(
            f"Food budget: about Rs {access['daily_budget_inr']} a day, so favour affordable everyday "
            "foods (dal, chana, seasonal sabzi, eggs, curd, rice, roti) over costly ones."
        )
    if access.get("open_to_new_ingredients") is False:
        lines.append("Prefers familiar dishes over new ones.")
    return lines


def build_prompt(
    targets: dict,
    slots: List[dict],
    pool: List[Food],
    prefs: dict,
    access: dict,
    avoid_names: Sequence[str] = (),
    keep: Optional[List[dict]] = None,
) -> str:
    """The plan request. ``keep`` lists meals that stay as they are (one-meal regeneration)."""
    slot_lines = [
        f"- {s['id']}: {s['time']}, about {round(targets['calories'] * s['share'])} kcal" for s in slots
    ]
    parts = [
        "Plan one day of meals.",
        f"Daily targets: {targets['calories']} kcal, {targets['protein']} g protein, "
        f"{targets['carbs']} g carbs, {targets['fats']} g fat, {targets['fiber']} g fiber.",
        "Meals to plan (slot: time, calories):",
        *slot_lines,
        *_profile_lines(prefs, access),
    ]
    if keep:
        kept = "; ".join(f"{m['id']}: {', '.join(i['name'] for i in m['items'])}" for m in keep)
        parts.append(f"The rest of the day is already planned ({kept}). Don't repeat those dishes.")
    if avoid_names:
        parts.append(f"Use different dishes from these, for variety: {', '.join(avoid_names)}.")
    parts += [
        "",
        "Rules:",
        "- Use ONLY foods from the list below, by their exact id.",
        "- Build normal meals: lunch and dinner are a grain (roti, rice, millet) with dal or a curry "
        "and a sabzi, salad or curd. Breakfast is one main dish with an optional drink or fruit. "
        "Snacks are small: fruit, sprouts, chana, curd, buttermilk, nuts, an egg.",
        "- Reaching the protein target matters most after calories. Every meal, snacks included, "
        "has a good protein source (dal, chana, rajma, sprouts, paneer, curd, tofu, soya, egg, "
        "chicken, fish), and prefer protein-dense options over extra rice or bread.",
        "- servings is how many of the listed serving unit (2 for two roti, 1.5 for one and a half "
        "bowls). Aim near each meal's calories; portions are fine-tuned afterwards.",
        "- 2 to 4 foods per main meal, 1 or 2 per snack. Don't repeat a dish in the day.",
        "",
        "Foods (id | name | serving | per serving):",
        *[_serving_line(f) for f in pool],
    ]
    return "\n".join(parts)


async def pick_meals(
    targets: dict,
    slots: List[dict],
    pool: List[Food],
    prefs: dict,
    access: dict,
    user_id: str,
    avoid_names: Sequence[str] = (),
    keep: Optional[List[dict]] = None,
) -> PlanPick:
    """Ask the AI to choose dishes for ``slots``.

    Raises:
        AIError: if the quota is used up or no valid plan comes back.
    """
    schema = pick_schema({f.id for f in pool}, [s["id"] for s in slots])
    prompt = build_prompt(targets, slots, pool, prefs, access, avoid_names, keep)
    return await ai_client.generate_json(
        prompt, schema, system=SYSTEM_PROMPT, temperature=0.7, user_id=user_id, retries=2
    )


# --- Numbers from the database, portions fitted in code ---------------------
MAX_PIECES = 6
MAX_CONTAINERS = 3
# No single food above this much in one meal (900 g of rice is not a portion).
MAX_ITEM_GRAMS = 350
MAX_FIT_STEPS = 40


def _step(food: Food) -> float:
    """Portion step: whole pieces (one roti), half containers (half a bowl)."""
    return 1.0 if is_piece_unit(food.serving.unit) else 0.5


# Tighter caps for foods where the general piece limit would look odd.
MAX_BY_UNIT = {"egg": 3}


def _bounds(food: Food) -> Tuple[float, float]:
    step = _step(food)
    high = MAX_BY_UNIT.get(food.serving.unit, MAX_PIECES if step == 1 else MAX_CONTAINERS)
    by_weight = (MAX_ITEM_GRAMS / max(food.serving.grams, 1)) // step * step
    return step, max(step, min(high, by_weight))


def snap(food: Food, servings: float) -> float:
    """Round to the food's portion step, within sensible limits."""
    step = _step(food)
    low, high = _bounds(food)
    return min(max(round(servings / step) * step, low), high)


def build_item(food: Food, servings: float) -> dict:
    """A plan item with database numbers (same shape as a logged meal item)."""
    grams = round(servings * food.serving.grams, 1)
    return {
        "food_id": food.id,
        "name": food.name,
        "source": food.source if food.source in ("INDB", "USDA") else "custom",
        "verified": True,
        "quantity": servings,
        "unit": food.serving.unit,
        "grams": grams,
        "nutrients": food.per_100g.scaled(grams / 100).model_dump(),
        "per_100g": food.per_100g.model_dump(),
    }


def totals_of(items: List[dict]) -> dict:
    total = Nutrients()
    for item in items:
        total = total.plus(Nutrients(**item["nutrients"]))
    return total.model_dump()


# How much keeping each meal near its own share counts, next to the day's totals.
# Below 1 so the day can still reach its target when one meal can't grow further,
# but high enough that food goes to the meals that are short first.
MEAL_BALANCE_WEIGHT = 0.6
PROTEIN_WEIGHT = 0.5
FAT_OVER_WEIGHT = 0.25
# Foods this light (tea, a salad) are left at the amount chosen; scaling them
# only produces silly portions ("2.5 cups of tea") for a few calories.
MIN_SCALABLE_KCAL = 60


class _Day:
    """Running totals while portions are fitted."""

    def __init__(self, meals: List[dict]):
        self.meal_kcal = {m["id"]: sum(i["nutrients"]["kcal"] for i in m["items"]) for m in meals}
        self.protein = sum(i["nutrients"]["protein"] for m in meals for i in m["items"])
        self.fat = sum(i["nutrients"]["fat"] for m in meals for i in m["items"])

    def score(self, meals: List[dict], targets: dict, changes: Sequence[Tuple[str, Nutrients]] = ()) -> float:
        """Lower is better: calorie miss, protein shortfall, fat overshoot and meal balance."""
        meal_kcal, protein, fat = dict(self.meal_kcal), self.protein, self.fat
        for meal_id, change in changes:
            meal_kcal[meal_id] += change.kcal
            protein += change.protein
            fat += change.fat
        calories = targets["calories"]
        day_miss = abs(sum(meal_kcal.values()) - calories) / calories
        protein_short = max(targets["protein"] - protein, 0) / max(targets["protein"], 1)
        fat_over = max(fat - targets["fats"], 0) / max(targets["fats"], 1)
        balance = sum(abs(meal_kcal[m["id"]] - calories * m["share"]) for m in meals) / calories
        return (
            day_miss + PROTEIN_WEIGHT * protein_short + FAT_OVER_WEIGHT * fat_over
            + MEAL_BALANCE_WEIGHT * balance
        )


def fit_portions(
    meals: List[dict], targets: dict, foods: Dict[str, Food], fixed: Sequence[str] = ()
) -> None:
    """Adjust portions in sensible steps toward the targets (in place).

    Each round applies the best single change: one portion up or down, or an
    exchange (one portion down and another up, e.g. less rice and more curd
    for protein), until nothing improves the score (see :meth:`_Day.score`).
    Meals in ``fixed`` aren't touched (the ones a regeneration kept).
    """
    for _ in range(MAX_FIT_STEPS):
        day = _Day(meals)
        # Every possible one-step change: (meal, item index, food, new servings, nutrient change).
        steps = []
        for meal in meals:
            if meal["id"] in fixed:
                continue
            for index, item in enumerate(meal["items"]):
                food = foods.get(item["food_id"])
                if food is None:
                    continue
                per = food.per_100g.scaled(food.serving.grams / 100)
                if per.kcal < MIN_SCALABLE_KCAL:
                    continue
                low, high = _bounds(food)
                for delta in (_step(food), -_step(food)):
                    if low <= item["quantity"] + delta <= high:
                        steps.append((meal, index, food, item["quantity"] + delta, per.scaled(delta)))
        moves = [[s] for s in steps] + [
            [up, down] for up in steps for down in steps
            if up[4].kcal > 0 > down[4].kcal and (up[0]["id"], up[1]) != (down[0]["id"], down[1])
        ]
        best_score, best_move = day.score(meals, targets), None
        for move in moves:
            score = day.score(meals, targets, [(m["id"], change) for m, _, _, _, change in move])
            if score < best_score - 1e-6:
                best_score, best_move = score, move
        if best_move is None:
            break
        for meal, index, food, servings, _ in best_move:
            meal["items"][index] = build_item(food, servings)
    for meal in meals:
        meal["totals"] = totals_of(meal["items"])


def assemble(pick: PlanPick, slots: List[dict], foods: Dict[str, Food]) -> List[dict]:
    """Turn the AI's choice into plan meals with database numbers, in slot order."""
    by_slot = {m.slot: m for m in pick.meals}
    meals = []
    for slot in slots:
        items = []
        seen = set()
        for picked in by_slot[slot["id"]].items:
            if picked.food_id in seen:
                continue
            seen.add(picked.food_id)
            food = foods[picked.food_id]
            items.append(build_item(food, snap(food, picked.servings)))
        meals.append({**slot, "items": items, "totals": totals_of(items)})
    return meals


def protein_note(meals: List[dict], targets: dict) -> Optional[dict]:
    """A note when the fitted plan still falls short on protein."""
    protein = sum(m["totals"]["protein"] for m in meals)
    if protein < targets["protein"] * 0.9:
        return {"code": "protein_short", "values": {"grams": round(targets["protein"] - protein)}}
    return None


# --- Swaps ---------------------------------------------------------------------
SWAP_LIMIT = 6

# What part a food plays in a meal, so swaps stay sensible (a grain for a
# grain, never fruit for rice). Checked in this order; the first match wins.
ROLE_WORDS: List[Tuple[str, frozenset]] = [
    ("fruit", frozenset({
        "banana", "apple", "orange", "mango", "papaya", "guava", "grape", "grapes", "pomegranate",
        "watermelon", "melon", "pear", "chikoo", "pineapple", "fruit",
    })),
    ("drink", frozenset({"tea", "coffee"})),
    ("protein", frozenset({
        "dal", "lentil", "lentils", "chickpeas", "rajma", "lobia", "moong", "masoor", "urad",
        "paneer", "tofu", "soya", "soy", "egg", "omelette", "bhurji", "chicken", "mutton", "fish",
        "keema", "sprouted", "kidney", "sambar", "prawn", "beans",
    })),
    ("grain", frozenset({
        "rice", "roti", "paratha", "bread", "toast", "pav", "naan", "poha", "upma", "dosa", "idli",
        "uttapam", "oats", "porridge", "daliya", "dalia", "khichdi", "pulao", "biryani", "millet",
        "bajra", "jowar", "ragi", "quinoa", "thepla", "cheela", "makki", "semolina", "vermicelli",
        "kulcha", "sandwich",
    })),
    ("dairy", frozenset({"curd", "milk", "lassi", "chaas", "buttermilk", "raita"})),
    ("vegetable", frozenset({
        "sabzi", "cabbage", "cauliflower", "okra", "brinjal", "peas", "gourd", "spinach", "methi",
        "pumpkin", "potato", "carrot", "salad", "cucumber", "tomato", "vegetable", "avial",
        "poriyal", "thoran", "kootu", "capsicum", "bhaji", "mushroom", "corn",
    })),
]


def food_role(food: Food) -> Optional[str]:
    """The food's part in a meal (grain, protein, vegetable...), or None if unclear."""
    found = food_tokens(food)
    return next((role for role, words in ROLE_WORDS if found & words), None)


def pool_without_meal(pool: List[Food], meal_items: List[dict]) -> List[Food]:
    """The food list for a "different option": the old meal's dishes are taken
    out so the new one really is different, except one grain (roti or rice
    with dinner is normal, not a repeat)."""
    by_id = {f.id: f for f in pool}
    old = [by_id[i["food_id"]] for i in meal_items if i["food_id"] in by_id]
    kept_grain = next((f.id for f in old if food_role(f) == "grain"), None)
    removed = {f.id for f in old} - {kept_grain}
    return [f for f in pool if f.id not in removed]


def _shares(n: Nutrients) -> Tuple[float, float, float]:
    energy = 4 * n.protein + 4 * n.carbs + 9 * n.fat or 1
    return 4 * n.protein / energy, 4 * n.carbs / energy, 9 * n.fat / energy


def swap_options(
    item: dict, pool: List[Food], exclude_ids: set, query: Optional[str] = None,
    original: Optional[Food] = None,
) -> List[dict]:
    """Foods that can replace ``item``, each sized to roughly its calories.

    Without a query, foods with the same role come first (a grain for a
    grain), closest in macro profile. With a query, the closest names from
    the allowed list.
    """
    current = Nutrients(**item["nutrients"])
    candidates = [f for f in pool if f.id not in exclude_ids]
    if query:
        allowed = {f.id for f in candidates}
        chosen = [m.food for m in food_db.search(query, limit=40) if m.food.id in allowed][:SWAP_LIMIT]
    else:
        role = food_role(original) if original else None
        target = _shares(current)

        def rank(food: Food) -> Tuple[int, float]:
            distance = sum((a - b) ** 2 for a, b in zip(_shares(food.per_100g), target))
            return (0 if role and food_role(food) == role else 1, distance)

        chosen = sorted(candidates, key=rank)[:SWAP_LIMIT]
    options = []
    for food in chosen:
        per_serving = food.per_100g.scaled(food.serving.grams / 100).kcal or 1
        options.append(build_item(food, snap(food, current.kcal / per_serving)))
    return options


# --- Rule-based fallback ------------------------------------------------------
# When the AI is down or busy, plans are still built from the allowed foods
# with ordinary Indian meal templates; fit_portions then sizes them.

BREAKFAST_WORDS = frozenset({
    "poha", "upma", "idli", "dosa", "uttapam", "paratha", "cheela", "oats", "porridge", "daliya",
    "dalia", "sandwich", "toast", "thepla", "dhokla", "semolina",
})
PLAIN_GRAIN_WORDS = frozenset({"roti", "rice", "chapati"})
MAIN_GRAIN_WORDS = PLAIN_GRAIN_WORDS | frozenset({"pulao", "khichdi", "millet", "bajra", "jowar", "ragi", "makki"})
PROTEIN_DISH_WORDS = frozenset({
    "dal", "curry", "rajma", "chickpeas", "sambar", "bhurji", "paneer", "kadhi", "lobia", "tikka",
})
DAIRY_SIDE_WORDS = frozenset({"curd", "raita", "chaas", "buttermilk"})
SNACK_PROTEIN_WORDS = frozenset({"sprouted", "chickpeas", "egg", "curd", "chana", "peanut", "tofu"})
# Kept out of fallback plans: fried, sweet, restaurant-style or non-Indian dishes.
# Matched against the whole dish name, so numbers ("Gobi 65") count too.
FALLBACK_AVOID_WORDS = frozenset({
    "sweet", "65", "fried", "manchurian", "chilli", "fry", "makhani", "malai", "shahi", "korma",
    "biryani", "curd rice", "milkshake", "mexican", "spanish", "pasta", "hawain", "hawaiian", "kale",
    "chinese", "continental", "pizza", "noodles",
})
# Everyday cooked vegetables (sabzi), preferred over salads.
SABZI_WORDS = frozenset({
    "sabzi", "cauliflower", "okra", "cabbage", "peas", "beans", "gourd", "spinach", "methi",
    "pumpkin", "avial", "poriyal", "thoran", "bhaji", "potato", "brinjal", "carrot", "capsicum",
})

# Each slot is a list of dish kinds, filled in order; a kind with no allowed food is skipped.
FALLBACK_TEMPLATES: Dict[str, List[str]] = {
    "breakfast": ["breakfast", "dairy_or_fruit"],
    "mid_morning": ["fruit"],
    "lunch": ["main_grain", "protein_dish", "vegetable_dish", "dairy_side"],
    "evening_snack": ["snack_protein"],
    "dinner": ["main_grain", "protein_dish", "vegetable_dish"],
    "bedtime": ["milk"],
}
# How many top-ranked options each kind rotates through, for variety between plans.
FALLBACK_CHOICES = 6


def _avoided(food: Food) -> bool:
    text = f" {normalize(food.name)} {normalize(food.full_name)} "
    return any(f" {word} " in text for word in FALLBACK_AVOID_WORDS)


def _fits(food: Food, kind: str) -> bool:
    found = food_tokens(food)
    if _avoided(food):
        return False
    role = food_role(food)
    dish = food.source != "USDA"  # A cooked dish, not a raw ingredient.
    if kind == "breakfast":
        return bool(found & BREAKFAST_WORDS)
    if kind == "main_grain":
        return bool(found & MAIN_GRAIN_WORDS) and not (found & DAIRY_SIDE_WORDS)
    if kind == "protein_dish":
        return role == "protein" and dish and bool(found & PROTEIN_DISH_WORDS)
    if kind == "vegetable_dish":
        return role == "vegetable" and dish
    if kind == "dairy_side":
        return bool(found & DAIRY_SIDE_WORDS) and role in ("dairy", None)
    if kind == "dairy_or_fruit":
        return role in ("dairy", "fruit")
    if kind == "snack_protein":
        return bool(found & SNACK_PROTEIN_WORDS) and "curry" not in found and role != "grain"
    if kind == "milk":
        return "milk" in found
    return role == kind


# The plain staples people mean by "roti" and "rice".
PLAIN_GRAIN_IDS = frozenset({food_db.GENERIC_ALIASES["roti"], food_db.GENERIC_ALIASES["rice"]})


def _rank(food: Food, kind: str) -> int:
    """Order within a kind so meals look like normal home meals: plain roti and
    rice first, then other Indian grains; cooked sabzi before salads."""
    if kind == "main_grain":
        if food.id in PLAIN_GRAIN_IDS:
            return 0
        return 1 if food_tokens(food) & PLAIN_GRAIN_WORDS else 2
    if kind == "vegetable_dish":
        return 0 if food_tokens(food) & SABZI_WORDS else 1
    return 0


def rule_based_pick(slots: List[dict], pool: List[Food], variant: int = 0) -> PlanPick:
    """A plan without AI: ordinary meal templates filled from the allowed foods.

    ``variant`` rotates the choices so a new plan isn't identical to the last.
    """
    used: set = set()
    meals = []
    for slot_index, slot in enumerate(slots):
        items = []
        for kind_index, kind in enumerate(FALLBACK_TEMPLATES.get(slot["id"], ["protein"])):
            matching = [f for f in pool if f.id not in used and _fits(f, kind)]
            # Only the best-ranked group (plain roti and rice, cooked sabzi) when there is one.
            best = min((_rank(f, kind) for f in matching), default=0)
            options = [f for f in matching if _rank(f, kind) == best][:FALLBACK_CHOICES]
            if not options:
                continue
            food = options[(variant + slot_index + kind_index) % len(options)]
            used.add(food.id)
            items.append(PickedItem(food_id=food.id, servings=1))
        if not items:
            # Every slot needs something; fall back to the best remaining staple.
            spare = next((f for f in pool if f.id not in used), None)
            if spare is None:
                continue
            used.add(spare.id)
            items.append(PickedItem(food_id=spare.id, servings=1))
        meals.append(PickedMeal(slot=slot["id"], items=items))
    return PlanPick(meals=meals)

