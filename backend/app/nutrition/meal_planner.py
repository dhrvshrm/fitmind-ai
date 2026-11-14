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
from app.nutrition import food_db, routine
from app.nutrition.diet_rules import (
    DietRules,
    STAPLE_WORDS,
    food_tokens,
    suitable_for_plans,
)
from app.nutrition.fasting import FAST_STAPLES
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
    # Added for people who train in the morning: something light before the workout.
    "pre_workout": ("snack", "06:30", 0.06),
    # Ramadan: before dawn, at sunset, and a light meal later in the evening.
    "sehri": ("breakfast", "04:15", 0.40),
    "iftar": ("dinner", "18:30", 0.40),
    "post_iftar": ("snack", "21:00", 0.20),
}
RAMADAN_SLOTS = ["sehri", "iftar", "post_iftar"]
# Sehri ends this long before dawn; the late meal comes this long after iftar.
SEHRI_BEFORE_DAWN = 45
POST_IFTAR_GAP = 150
MAIN_SLOTS = {"breakfast", "lunch", "dinner"}
# What each slot is for, told to the planner when the workout shapes the day.
SLOT_PURPOSE = {
    "pre_workout": "light and easy to digest, mainly carbs (fruit, a few dates), about 30 minutes before training",
    "post_workout": "after training: include a good protein source",
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


def _slot_list(
    keys: List[str], times: Dict[str, str], purpose: Dict[str, str], day_start: int = 0
) -> List[dict]:
    """Slots with shares that add up to 1, ordered from ``day_start`` (minutes) on."""
    total_share = sum(SLOTS[key][2] for key in keys)
    slots = [
        {
            "id": key,
            "meal_type": SLOTS[key][0],
            "time": times[key],
            "share": round(SLOTS[key][2] / total_share, 3),
            **(
                {
                    "purpose": purpose[key],
                    "workout_role": (
                        "pre" if purpose[key] == SLOT_PURPOSE["pre_workout"] else "post"
                    ),
                }
                if key in purpose
                else {}
            ),
        }
        for key in keys
    ]
    return sorted(slots, key=lambda s: routine.since(day_start, _minutes(s["time"])))


def _ramadan_slots(
    lifestyle: dict, workout_time: Optional[str], trains: bool, fasting_mode: dict
) -> List[dict]:
    """Sehri before dawn, iftar at sunset and a light meal later; nothing in daytime."""
    dawn, sunset = routine.ramadan_times(fasting_mode)
    sleep = _minutes(lifestyle.get("sleep_time") or routine.DEFAULT_SLEEP)
    # The late meal comes well after iftar but still before bed.
    late = min(POST_IFTAR_GAP, max(routine.since(sunset, sleep) - 45, 60))
    times = {
        "sehri": _hhmm(dawn - SEHRI_BEFORE_DAWN),
        "iftar": _hhmm(sunset),
        "post_iftar": _hhmm(sunset + late),
    }
    purpose = (
        {"post_iftar": SLOT_PURPOSE["post_workout"]} if trains and workout_time else {}
    )
    return _slot_list(
        list(RAMADAN_SLOTS), times, purpose, dawn - SEHRI_BEFORE_DAWN - 60
    )


def _shift_slots(
    lifestyle: dict, keys: List[str], workout_time: Optional[str], trains: bool
) -> List[dict]:
    """Meal times measured from the person's own wake and sleep times (night or
    rotating shifts): first meal an hour after waking, the last main meal about
    two and a half hours before sleep, the rest spaced evenly between."""
    wake = _minutes(lifestyle["wake_time"])
    awake = routine.awake_minutes(lifestyle)
    first, last = 60, max(awake - 150, 60 + 6 * 60)
    middle = (first + last) // 2
    all_offsets = {
        "breakfast": first,
        "mid_morning": (first + middle) // 2,
        "lunch": middle if "breakfast" in keys else first + 120,
        "evening_snack": (middle + last) // 2,
        "dinner": last,
        "bedtime": awake - 60,
    }
    offsets = {key: all_offsets[key] for key in keys}
    purpose: Dict[str, str] = {}
    window = routine.workout_window(lifestyle, workout_time, trains)
    if window:
        start = routine.since(wake, window[0])
        end = start + routine.WORKOUT_MINUTES
        # Protein-focused: the first main meal soon after training, else the first meal after it.
        # A meal that would clash with the workout moves after it.
        later = [
            k for k in sorted(offsets, key=offsets.get) if offsets[k] >= start - 30
        ]
        after = next(
            (k for k in later if k in MAIN_SLOTS and offsets[k] <= end + 180), None
        ) or (later[0] if later else None)
        if after:
            offsets[after] = max(offsets[after], end + routine.POST_WORKOUT_GAP)
            purpose[after] = SLOT_PURPOSE["post_workout"]
        # Something light before: a snack in the two hours before, or a new pre-workout snack.
        before = [
            k
            for k in offsets
            if k in SNACK_SLOTS and start - 120 <= offsets[k] <= start - 30
        ]
        if before:
            offsets[before[-1]] = start - routine.EVENING_SNACK_LEAD
            purpose[before[-1]] = SLOT_PURPOSE["pre_workout"]
        elif not any(start - 180 <= o < start for o in offsets.values()):
            keys = ["pre_workout", *keys]
            offsets["pre_workout"] = max(10, start - routine.PRE_WORKOUT_LEAD)
            purpose["pre_workout"] = SLOT_PURPOSE["pre_workout"]
    # Rounded to the quarter hour, so times read like a person's day ("19:15", not "19:07").
    times = {
        key: _hhmm(wake + round(offset / 15) * 15) for key, offset in offsets.items()
    }
    return _slot_list(keys, times, purpose, wake)


def plan_slots(
    lifestyle: Optional[dict],
    workout_time: Optional[str] = None,
    trains: bool = False,
    fasting_mode: Optional[dict] = None,
) -> List[dict]:
    """The day's meals with times and calorie shares, from the person's routine.

    When they train at a set time, meals move around the workout: a light
    snack before it and a protein-focused meal after it. Shift workers get
    times from their own wake and sleep times, and Ramadan (``fasting_mode``
    ``{"mode": "ramadan", "dawn_time", "sunset_time"}``) gives sehri, iftar and a late meal.
    """
    lifestyle = lifestyle or {}
    if routine.is_ramadan(fasting_mode):
        return _ramadan_slots(lifestyle, workout_time, trains, fasting_mode)
    count = min(max(lifestyle.get("meals_per_day") or DEFAULT_MEAL_COUNT, 2), 6)
    keys = SLOTS_BY_MEAL_COUNT[count]
    if routine.is_shift_schedule(lifestyle):
        return _shift_slots(lifestyle, list(keys), workout_time, trains)
    times = {key: SLOTS[key][1] for key in keys}
    wake, sleep = lifestyle.get("wake_time"), lifestyle.get("sleep_time")
    # Usual day schedules; shift workers are handled above.
    if wake and 4 * 60 <= _minutes(wake) <= 11 * 60 and "breakfast" in times:
        times["breakfast"] = _hhmm(_minutes(wake) + 60)
        if "mid_morning" in times:
            times["mid_morning"] = _hhmm(
                max(_minutes(wake) + 180, _minutes(times["breakfast"]) + 120)
            )
    if sleep and (_minutes(sleep) >= 21 * 60 or _minutes(sleep) <= 2 * 60):
        bed = _minutes(sleep) + (24 * 60 if _minutes(sleep) <= 2 * 60 else 0)
        times["dinner"] = _hhmm(min(bed - 150, 21 * 60 + 30))
        if "bedtime" in times:
            times["bedtime"] = _hhmm(bed - 60)
    purpose: Dict[str, str] = {}
    window = routine.workout_window(lifestyle, workout_time, trains)
    if window:
        start, end = window
        if workout_time in routine.MORNING_WORKOUTS:
            keys = ["pre_workout", *keys]
            wake = _minutes(lifestyle.get("wake_time") or routine.DEFAULT_WAKE)
            times["pre_workout"] = _hhmm(
                max(wake + 10, start - routine.PRE_WORKOUT_LEAD)
            )
            purpose["pre_workout"] = SLOT_PURPOSE["pre_workout"]
            after = "breakfast" if "breakfast" in times else "lunch"
            times[after] = _hhmm(
                max(_minutes(times[after]), end + routine.POST_WORKOUT_GAP)
            )
            purpose[after] = SLOT_PURPOSE["post_workout"]
            if "mid_morning" in times:
                times["mid_morning"] = _hhmm(
                    max(_minutes(times["mid_morning"]), _minutes(times[after]) + 150)
                )
        else:
            if "evening_snack" in times:
                times["evening_snack"] = _hhmm(start - routine.EVENING_SNACK_LEAD)
                purpose["evening_snack"] = SLOT_PURPOSE["pre_workout"]
            times["dinner"] = _hhmm(
                max(_minutes(times["dinner"]), end + routine.POST_WORKOUT_GAP)
            )
            purpose["dinner"] = SLOT_PURPOSE["post_workout"]
    return _slot_list(keys, times, purpose)


# --- Food list offered to the AI --------------------------------------------
POOL_LIMIT = 220
# The dishes people mean by "dal", "roti", "poha"... and plain staples (curd, milk, fruit, eggs).
CORE_FOOD_IDS = frozenset(food_db.GENERIC_ALIASES.values())
# Everyday protein staples (paneer, hung curd, soya chunks, roasted chana) are
# always offered when the diet allows them, so a plan can reach its protein target.
PROTEIN_STAPLE_IDS = frozenset(
    {
        "est:paneer",
        "est:paneer_bhurji",
        "est:soya_chunk_curry",
        "est:hung_curd",
        "est:roasted_chana",
    }
)
CORE_SOURCES = frozenset({"USDA"})


def food_pool(
    rules: DietRules, prefs: Optional[dict], user_foods: Sequence[Food] = ()
) -> List[Food]:
    """Foods the person can be offered, best first, trimmed to ``POOL_LIMIT``.

    Order: their own foods, then core staples, then dishes matching their
    likes and cuisines, then other everyday dishes, simpler (shorter) names first.
    """
    prefs = prefs or {}
    liked = set()
    for term in (prefs.get("likes") or []) + (prefs.get("cuisines") or []):
        liked |= tokens(term)
    own = [f for f in user_foods if rules.allows(f)]
    # An active fasting mode puts its own staples first (kuttu and samak, dates for iftar).
    preferred = (
        rules.fasting_mode.preferred_words if rules.fasting_mode else frozenset()
    )
    scored = []
    for entry in food_db._index():
        food = entry.food
        if not suitable_for_plans(food) or not rules.allows(food):
            continue
        found = food_tokens(food)
        score = (
            (3 if found & preferred else 0)
            + (4 if food.id in PROTEIN_STAPLE_IDS else 0)
            + (3 if food.id in CORE_FOOD_IDS or food.source in CORE_SOURCES else 0)
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
            unknown = sorted(
                {i.food_id for m in self.meals for i in m.items} - allowed_ids
            )
            if unknown:
                raise ValueError(
                    f"food_id not in the list: {', '.join(unknown[:5])}. Use only listed ids"
                )
            got = [m.slot for m in self.meals]
            if sorted(got) != sorted(slots):
                raise ValueError(
                    f"meals must be exactly these slots, once each: {', '.join(slots)}"
                )
            return self

    return ConstrainedPlanPick


SYSTEM_PROMPT = (
    "You are a dietitian in India building practical home-style meal plans. You choose dishes "
    "only from the food list you are given and refer to them by id. You plan normal Indian "
    "meals that a family would actually cook or a mess would serve. Keep cooking simple: "
    "dishes with few ingredients that take about 30 minutes or less, and plain staples "
    "(curd, eggs, roasted chana, paneer, fruit) that need no cooking at all."
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
    extra_lines: Sequence[str] = (),
) -> str:
    """The plan request. ``keep`` lists meals that stay as they are (one-meal regeneration);
    ``extra_lines`` adds instructions such as an active fasting mode's."""
    slot_lines = [
        f"- {s['id']}: {s['time']}, about {round(targets['calories'] * s['share'])} kcal"
        + (f" ({s['purpose']})" if s.get("purpose") else "")
        for s in slots
    ]
    parts = [
        "Plan one day of meals.",
        f"Daily targets: {targets['calories']} kcal, {targets['protein']} g protein, "
        f"{targets['carbs']} g carbs, {targets['fats']} g fat, {targets['fiber']} g fiber.",
        "Meals to plan (slot: time, calories):",
        *slot_lines,
        *_profile_lines(prefs, access),
        *extra_lines,
    ]
    if keep:
        kept = "; ".join(
            f"{m['id']}: {', '.join(i['name'] for i in m['items'])}" for m in keep
        )
        parts.append(
            f"The rest of the day is already planned ({kept}). Don't repeat those dishes."
        )
    if avoid_names:
        parts.append(
            f"Use different dishes from these, for variety: {', '.join(avoid_names)}."
        )
    parts += [
        "",
        "Rules:",
        "- Use ONLY foods from the list below, by their exact id.",
        "- Build normal meals: lunch and dinner are a grain (roti, rice, millet) with dal or a curry "
        "and a sabzi, salad or curd. Breakfast is one main dish with an optional drink or fruit. "
        "Snacks are small: fruit, sprouts, chana, curd, buttermilk, nuts, an egg.",
        "- Reaching the protein target matters most after calories. Every meal and snack has a good "
        "protein source (dal, chana, rajma, sprouts, paneer, curd, tofu, soya, egg, chicken, fish), "
        "and prefer protein-dense options over extra rice or bread.",
        "- Except the snack before a workout: only something light, low in fat and fibre, mostly "
        "carbs (a banana or other fruit, dates, toast). No curd, raita, dal, chana, sprouts, paneer "
        "or fried food then; they sit heavy during training.",
        "- No tea or coffee with dinner or later in the evening; caffeine then hurts sleep.",
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
    extra_lines: Sequence[str] = (),
) -> PlanPick:
    """Ask the AI to choose dishes for ``slots``.

    Raises:
        AIError: if the quota is used up or no valid plan comes back.
    """
    schema = pick_schema({f.id for f in pool}, [s["id"] for s in slots])
    prompt = build_prompt(
        targets, slots, pool, prefs, access, avoid_names, keep, extra_lines
    )
    return await ai_client.generate_json(
        prompt,
        schema,
        system=SYSTEM_PROMPT,
        temperature=0.7,
        user_id=user_id,
        retries=2,
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
MAX_BY_UNIT = {"egg": 3, "small bowl": 2}


def _bounds(food: Food) -> Tuple[float, float]:
    step = _step(food)
    high = MAX_BY_UNIT.get(
        food.serving.unit, MAX_PIECES if step == 1 else MAX_CONTAINERS
    )
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
        "source": (
            food.source
            if food.source in ("INDB", "USDA", *food_db.ESTIMATE_SOURCES)
            else "custom"
        ),
        # Hand-built estimates (a few fasting dishes) are labelled, never passed off as verified.
        "verified": food.source not in food_db.ESTIMATE_SOURCES,
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
PROTEIN_WEIGHT = 1.0
FAT_OVER_WEIGHT = 0.5
# Carbs and fiber count too, more lightly: with calories, protein and fat on
# target, carbs follow, so this mostly breaks ties toward a closer fit.
CARB_WEIGHT = 0.15
FIBER_SHORT_WEIGHT = 0.1
# Foods this light (tea, a salad) are left at the amount chosen; scaling them
# only produces silly portions ("2.5 cups of tea") for a few calories.
MIN_SCALABLE_KCAL = 60


class _Day:
    """Running totals while portions are fitted."""

    def __init__(self, meals: List[dict]):
        self.meal_kcal = {
            m["id"]: sum(i["nutrients"]["kcal"] for i in m["items"]) for m in meals
        }
        self.protein = sum(i["nutrients"]["protein"] for m in meals for i in m["items"])
        self.fat = sum(i["nutrients"]["fat"] for m in meals for i in m["items"])
        self.carbs = sum(i["nutrients"]["carbs"] for m in meals for i in m["items"])
        self.fiber = sum(i["nutrients"]["fiber"] for m in meals for i in m["items"])

    def score(
        self,
        meals: List[dict],
        targets: dict,
        changes: Sequence[Tuple[str, Nutrients]] = (),
    ) -> float:
        """Lower is better: calorie miss, protein shortfall, fat overshoot, carb miss,
        fiber shortfall and meal balance."""
        meal_kcal, protein, fat = dict(self.meal_kcal), self.protein, self.fat
        carbs, fiber = self.carbs, self.fiber
        for meal_id, change in changes:
            meal_kcal[meal_id] += change.kcal
            protein += change.protein
            fat += change.fat
            carbs += change.carbs
            fiber += change.fiber
        calories = targets["calories"]
        day_miss = abs(sum(meal_kcal.values()) - calories) / calories
        protein_short = max(targets["protein"] - protein, 0) / max(
            targets["protein"], 1
        )
        fat_over = max(fat - targets["fats"], 0) / max(targets["fats"], 1)
        carb_miss = (
            abs(carbs - targets["carbs"]) / max(targets.get("carbs") or 1, 1)
            if targets.get("carbs")
            else 0
        )
        fiber_short = (
            (max(targets["fiber"] - fiber, 0) / max(targets["fiber"], 1))
            if targets.get("fiber")
            else 0
        )
        balance = (
            sum(abs(meal_kcal[m["id"]] - calories * m["share"]) for m in meals)
            / calories
        )
        return (
            day_miss
            + PROTEIN_WEIGHT * protein_short
            + FAT_OVER_WEIGHT * fat_over
            + CARB_WEIGHT * carb_miss
            + FIBER_SHORT_WEIGHT * fiber_short
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
                        steps.append(
                            (
                                meal,
                                index,
                                food,
                                item["quantity"] + delta,
                                per.scaled(delta),
                            )
                        )
        moves = [[s] for s in steps] + [
            [up, down]
            for up in steps
            for down in steps
            if up[4].kcal > 0 > down[4].kcal
            and (up[0]["id"], up[1]) != (down[0]["id"], down[1])
        ]
        best_score, best_move = day.score(meals, targets), None
        for move in moves:
            score = day.score(
                meals, targets, [(m["id"], change) for m, _, _, _, change in move]
            )
            if score < best_score - 1e-6:
                best_score, best_move = score, move
        if best_move is None:
            break
        for meal, index, food, servings, _ in best_move:
            meal["items"][index] = build_item(food, servings)
    for meal in meals:
        meal["totals"] = totals_of(meal["items"])


# --- Closing the protein gap ---------------------------------------------------
# Resizing the chosen dishes can't reach the protein target when they are
# mostly rice, roti and sabzi. Then protein-rich foods the diet allows are
# added to the meals furthest behind, and portions are fitted again (less
# rice or roti, so calories stay on target).
PROTEIN_GOAL_SHARE = 0.95  # stop once the plan has this share of the protein target
MIN_PROTEIN_SHARE = 0.22  # a food counts as protein-rich above this share of its calories (roasted chana: 0.24)
LEAN_PROTEIN_SHARE = (
    0.4  # lean (hung curd, soya, egg whites, chicken): tried before paneer
)
MIN_SERVING_PROTEIN = 6.0  # grams in one serving, so an addition is worth it
MAX_PROTEIN_ADDS = 6
MAX_MEAL_ITEMS = 5
# What sits naturally in each kind of meal (tokens from the food's names).
BREAKFAST_PROTEIN_WORDS = frozenset(
    {
        "egg",
        "omelette",
        "scrambled",
        "bhurji",
        "curd",
        "milk",
        "paneer",
        "tofu",
        "cheela",
        "chilla",
        "sprouted",
        "moong",
        "besan",
    }
)
SNACK_PROTEIN_ADD_WORDS = frozenset(
    {
        "egg",
        "curd",
        "chana",
        "chickpeas",
        "sprouted",
        "paneer",
        "tofu",
        "milk",
        "peanuts",
        "roasted",
    }
)
MAIN_SLOT_IDS = frozenset({"lunch", "dinner", "iftar"})
BREAKFAST_SLOT_IDS = frozenset({"breakfast", "sehri"})


# --- What suits each meal ---------------------------------------------------------
# One rule set, used for the AI's choice, protein additions and swaps alike.
PRE_WORKOUT_AVOID = frozenset(
    {
        "raita",
        "curd",
        "dahi",
        "lassi",
        "dal",
        "curry",
        "rajma",
        "chana",
        "chickpeas",
        "sprouted",
        "paneer",
        "tofu",
        "soya",
        "soy",
        "peanut",
        "peanuts",
        "chicken",
        "fish",
        "mutton",
        "egg",
        "omelette",
        "bhurji",
        "paratha",
        "biryani",
        "cheese",
        "kofta",
        "korma",
        "beans",
        "lentils",
    }
)
# Light enough to train on 20 to 60 minutes later, per serving.
PRE_WORKOUT_MAX_FAT = 5.0
PRE_WORKOUT_MAX_FIBER = 5.0
CAFFEINE_WORDS = frozenset({"tea", "coffee", "chai", "espresso", "cappuccino"})
# Late in the day: no caffeine (it keeps you up).
LATE_SLOT_IDS = frozenset({"dinner", "bedtime", "post_iftar"})


def is_pre_workout(meal: dict) -> bool:
    return meal.get("workout_role") == "pre" or meal.get("id") == "pre_workout"


def suits_meal(food: Food, meal: dict) -> bool:
    """Whether a food belongs in this meal at all (whatever else is in it).

    Before a workout: light carbs only (no curd, dal, chana or anything fatty
    or high in fibre). With dinner and after: no tea or coffee.
    """
    found = food_tokens(food)
    if is_pre_workout(meal):
        per = food.per_100g.scaled(food.serving.grams / 100)
        if (
            found & PRE_WORKOUT_AVOID
            or per.fat > PRE_WORKOUT_MAX_FAT
            or per.fiber > PRE_WORKOUT_MAX_FIBER
        ):
            return False
    if meal.get("id") in LATE_SLOT_IDS and found & CAFFEINE_WORDS:
        return False
    return True


def enforce_meal_fit(
    meals: List[dict],
    pool: Sequence[Food],
    foods: Dict[str, Food],
    fixed: Sequence[str] = (),
) -> int:
    """Take out foods that don't suit their meal (in place); returns how many.

    A meal left empty gets the lightest suitable fruit (a banana before a workout).
    """
    removed = 0
    for meal in meals:
        if meal["id"] in fixed:
            continue
        kept = [
            i
            for i in meal["items"]
            if i["food_id"] not in foods or suits_meal(foods[i["food_id"]], meal)
        ]
        removed += len(meal["items"]) - len(kept)
        if not kept and meal["items"]:
            fruit = [f for f in pool if food_role(f) == "fruit" and suits_meal(f, meal)]
            # A banana is the classic pre-workout snack; otherwise the first allowed fruit.
            fruit.sort(key=lambda f: (0 if "banana" in food_tokens(f) else 1, f.name))
            if fruit:
                foods[fruit[0].id] = fruit[0]
                kept = [build_item(fruit[0], snap(fruit[0], 1.0))]
        meal["items"] = kept
        meal["totals"] = totals_of(kept)
    return removed


def _is_simple(food: Food) -> bool:
    """Plain staples and the protein staples: little or no cooking, few ingredients."""
    return food.id in PROTEIN_STAPLE_IDS or food.source in CORE_SOURCES


def _protein_share(food: Food) -> float:
    return food.per_100g.protein * 4 / food.per_100g.kcal if food.per_100g.kcal else 0.0


def _fits_slot(food: Food, meal: dict) -> bool:
    """Whether a protein food belongs in this meal (no paneer curry for a 5 pm snack,
    nothing heavy before a workout)."""
    if is_pre_workout(meal) or not suits_meal(food, meal):
        return False
    slot_id = meal["id"]
    found = food_tokens(food)
    if slot_id == "bedtime":
        return bool(found & BEDTIME_PROTEIN_WORDS) and "curry" not in found
    if slot_id in MAIN_SLOT_IDS:
        # Roasted chana is a snack, not part of lunch or dinner.
        if "roasted" in found:
            return False
        return food_role(food) in ("protein", "dairy") or bool(
            found & {"paneer", "soya", "tofu"}
        )
    if slot_id in BREAKFAST_SLOT_IDS:
        return bool(found & BREAKFAST_PROTEIN_WORDS)
    return bool(found & SNACK_PROTEIN_ADD_WORDS) and "curry" not in found


# Light before bed; roasted chana is the option for people who skip dairy.
BEDTIME_PROTEIN_WORDS = frozenset({"milk", "curd", "paneer", "roasted"})
SAME_KIND_WORDS = frozenset(
    {"curd", "paneer", "egg", "milk", "tofu", "soya", "chicken", "chana", "chickpeas"}
)
# An addition is undone if it pushes the day past these (portions couldn't absorb it).
MAX_KCAL_OVER = 1.04
# Protein comes first: fat may run a little over its target (a quarter) to reach it.
MAX_FAT_OVER = 1.25
MAX_PROTEIN_TRIES = 30
BEDTIME_ADDS = 2


def bedtime_slot(lifestyle: Optional[dict]) -> dict:
    """A small protein snack an hour before sleep, for when the day's meals fall short."""
    sleep = (lifestyle or {}).get("sleep_time")
    time = _hhmm(_minutes(sleep) - 60) if sleep else SLOTS["bedtime"][1]
    return {
        "id": "bedtime",
        "meal_type": "snack",
        "time": time,
        "share": SLOTS["bedtime"][2],
        "purpose": "a protein snack before bed",
        "items": [],
        "totals": Nutrients().model_dump(),
    }


SIDE_ROLES = frozenset({"fruit", "drink", "vegetable"})


def _weakest_side(meal: dict, foods: Dict[str, Food]) -> Optional[int]:
    """Index of the meal's side with the least protein for its calories, or None.

    Only fruit, drinks and vegetable sides are given up, never the grain or the
    dal; the meal keeps at least one vegetable.
    """
    sides = []
    for index, item in enumerate(meal["items"]):
        food = foods.get(item["food_id"])
        role = food_role(food) if food else None
        if role in SIDE_ROLES:
            sides.append((index, role, _protein_share(food)))
    if not sides:
        return None
    vegetables = sum(1 for _, role, _ in sides if role == "vegetable")
    options = [s for s in sides if s[1] != "vegetable" or vegetables > 1]
    return min(options, key=lambda s: s[2])[0] if options else None


def _open_bedtime(meals: List[dict], extra_slot: Optional[dict], targets: dict) -> bool:
    """Add the bedtime snack slot when it's offered, not there yet, and protein is still short."""
    import copy

    if not extra_slot or any(m["id"] == extra_slot["id"] for m in meals):
        return False
    if _day_totals(meals)["protein"] >= targets["protein"] * PROTEIN_GOAL_SHARE:
        return False
    meals.append(copy.deepcopy(extra_slot))
    return True


def _day_totals(meals: List[dict]) -> Dict[str, float]:
    return {
        k: sum(i["nutrients"][k] for m in meals for i in m["items"])
        for k in ("kcal", "protein", "fat")
    }


def boost_protein(
    meals: List[dict],
    targets: dict,
    pool: Sequence[Food],
    foods: Dict[str, Food],
    fixed: Sequence[str] = (),
    extra_slot: Optional[dict] = None,
) -> int:
    """Add protein-rich foods until the plan nears its protein target (in place).

    Simple foods (curd, eggs, paneer, soya, roasted chana) go to the meals
    furthest behind, one food at most once a day; portions are refitted after
    each, and an addition that would push calories or fat over is undone.
    When the meals still fall short, ``extra_slot`` (a snack before bed) is
    added with milk, hung curd or paneer. Returns how many foods were added.
    Meals in ``fixed`` aren't touched.
    """
    import copy

    candidates = [
        f
        for f in pool
        if _protein_share(f) >= MIN_PROTEIN_SHARE
        and f.per_100g.scaled(f.serving.grams / 100).protein >= MIN_SERVING_PROTEIN
    ]
    added, tries, limit = 0, 0, MAX_PROTEIN_ADDS
    rejected: set = set()
    while tries < MAX_PROTEIN_TRIES:
        if added >= limit:
            # Out of additions for the day's meals: a snack before bed can still close the gap.
            if not _open_bedtime(meals, extra_slot, targets):
                break
            limit += BEDTIME_ADDS
            continue
        before = _day_totals(meals)
        if before["protein"] >= targets["protein"] * PROTEIN_GOAL_SHARE:
            break
        used = {i["food_id"] for m in meals for i in m["items"]}
        best = None
        for meal in meals:
            if meal["id"] in fixed:
                continue
            # Either add the food, or (a full meal, or when adding overshoots) put it in
            # place of the meal's weakest side: fruit, a salad, a drink.
            weakest = _weakest_side(meal, foods)
            modes = ([None] if len(meal["items"]) < MAX_MEAL_ITEMS else []) + (
                [weakest] if weakest is not None else []
            )
            if not modes:
                continue
            meal_protein = sum(i["nutrients"]["protein"] for i in meal["items"])
            gap = targets["protein"] * meal.get("share", 0) - meal_protein
            in_meal = {i["food_id"] for i in meal["items"]}
            # No second curd next to curd, or egg next to egg, in one meal.
            meal_kinds = set().union(
                *(
                    food_tokens(foods[i["food_id"]]) & SAME_KIND_WORDS
                    for i in meal["items"]
                    if i["food_id"] in foods
                )
            )
            for food, replace in ((f, r) for f in candidates for r in modes):
                if (
                    food.id in in_meal
                    or (meal["id"], food.id, replace) in rejected
                    or food_tokens(food) & SAME_KIND_WORDS & meal_kinds
                    or not _fits_slot(food, meal)
                ):
                    continue
                # A food not yet in the day first (no tofu three times), then a simple one
                # (curd, eggs, paneer: little cooking), then the meal furthest behind,
                # then the leanest.
                rank = (
                    food.id not in used,
                    _is_simple(food),
                    _protein_share(food) >= LEAN_PROTEIN_SHARE,
                    round(gap / 5),
                    _protein_share(food),
                    replace is None,
                )
                if best is None or rank > best[0]:
                    best = (rank, meal, food, replace)
        if best is None:
            if _open_bedtime(meals, extra_slot, targets):
                limit = added + BEDTIME_ADDS
                continue
            break
        tries += 1
        _, meal, food, replace = best
        backup = copy.deepcopy(meals)
        foods[food.id] = food
        if replace is not None:
            meal["items"].pop(replace)
        meal["items"].append(build_item(food, snap(food, 1.0)))
        fit_portions(meals, targets, foods, fixed)
        after = _day_totals(meals)
        too_much = after["kcal"] > targets["calories"] * MAX_KCAL_OVER or after[
            "fat"
        ] > max(before["fat"], targets["fats"] * MAX_FAT_OVER)
        if too_much:
            meals[:] = backup
            rejected.add((meal["id"], food.id, replace))
            continue
        added += 1
    # A bedtime slot that got nothing isn't kept.
    meals[:] = [m for m in meals if m["items"]]
    for meal in meals:
        meal["totals"] = totals_of(meal["items"])
    return added


# --- Keeping fat on target ---------------------------------------------------------
# After protein is in, a plan can still carry too much fat (peanut pulao, paneer
# curry, lassi). The fattiest dishes are swapped for a leaner one of the same
# kind (chaas for lassi, plain pulao for peanut pulao) sized to the same
# calories, as long as protein and calories stay where they were.
FAT_OK_SHARE = 1.1  # fat within 10% of its target is fine
MIN_ITEM_FAT = 6.0  # grams: smaller sources aren't worth swapping
LEANER_BY = 0.7  # the swap's fat share must be at most 70% of the original's
MAX_FAT_SWAPS = 4


def _fat_share(food: Food) -> float:
    return food.per_100g.fat * 9 / food.per_100g.kcal if food.per_100g.kcal else 0.0


# this function swaps the fattiest dishes for leaner ones of the same kind (in place) and returns the number of swaps made.
def trim_fat(
    meals: List[dict],
    targets: dict,
    pool: Sequence[Food],
    foods: Dict[str, Food],
    fixed: Sequence[str] = (),
) -> int:
    """Swap the fattiest dishes for leaner ones of the same kind (in place); returns swaps made."""
    import copy

    swaps, tried = 0, set()
    while swaps < MAX_FAT_SWAPS:
        before = _day_totals(meals)
        if before["fat"] <= targets["fats"] * FAT_OK_SHARE:
            break
        # The fattiest swappable item first.
        items = sorted(
            (
                (meal, index, item)
                for meal in meals
                if meal["id"] not in fixed
                for index, item in enumerate(meal["items"])
                if item["food_id"] in foods
                and item["nutrients"]["fat"] >= MIN_ITEM_FAT
                and (meal["id"], item["food_id"]) not in tried
            ),
            key=lambda t: -t[2]["nutrients"]["fat"],
        )
        done = False
        for meal, index, item in items:
            tried.add((meal["id"], item["food_id"]))
            original = foods[item["food_id"]]
            role = food_role(original)
            if role is None:
                continue
            in_meal = {i["food_id"] for i in meal["items"]}
            options = [
                f
                for f in pool
                if f.id not in in_meal
                and food_role(f) == role
                and suits_meal(f, meal)
                and _fat_share(f) <= _fat_share(original) * LEANER_BY
                and _protein_share(f) >= _protein_share(original) - 0.05
            ]
            if not options:
                continue
            # Closest in protein, then the leanest.
            options.sort(
                key=lambda f: (
                    abs(_protein_share(f) - _protein_share(original)),
                    _fat_share(f),
                )
            )
            for option in options[:3]:
                backup = copy.deepcopy(meals)
                per_serving = (
                    option.per_100g.scaled(option.serving.grams / 100).kcal or 1
                )
                foods[option.id] = option
                meal["items"][index] = build_item(
                    option, snap(option, item["nutrients"]["kcal"] / per_serving)
                )
                fit_portions(meals, targets, foods, fixed)
                after = _day_totals(meals)
                if (
                    after["fat"] < before["fat"] - 2
                    and after["protein"]
                    >= min(before["protein"], targets["protein"] * PROTEIN_GOAL_SHARE)
                    - 1
                    and abs(after["kcal"] - targets["calories"])
                    <= targets["calories"] * (MAX_KCAL_OVER - 1)
                ):
                    swaps += 1
                    done = True
                    break
                meals[:] = backup
                meal = next(m for m in meals if m["id"] == meal["id"])
            if done:
                break
        if not done:
            break
    for meal in meals:
        meal["totals"] = totals_of(meal["items"])
    return swaps


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
        return {
            "code": "protein_short",
            "values": {"grams": round(targets["protein"] - protein)},
        }
    return None


# --- Swaps ---------------------------------------------------------------------
SWAP_LIMIT = 6

# What part a food plays in a meal, so swaps stay sensible (a grain for a
# grain, never fruit for rice). Checked in this order; the first match wins.
ROLE_WORDS: List[Tuple[str, frozenset]] = [
    (
        "fruit",
        frozenset(
            {
                "banana",
                "apple",
                "orange",
                "mango",
                "papaya",
                "guava",
                "grape",
                "grapes",
                "pomegranate",
                "watermelon",
                "melon",
                "pear",
                "chikoo",
                "pineapple",
                "fruit",
            }
        ),
    ),
    ("drink", frozenset({"tea", "coffee"})),
    (
        "protein",
        frozenset(
            {
                "dal",
                "lentil",
                "lentils",
                "chickpeas",
                "rajma",
                "lobia",
                "moong",
                "masoor",
                "urad",
                "paneer",
                "tofu",
                "soya",
                "soy",
                "egg",
                "omelette",
                "bhurji",
                "chicken",
                "mutton",
                "fish",
                "keema",
                "sprouted",
                "kidney",
                "sambar",
                "prawn",
                "beans",
            }
        ),
    ),
    (
        "grain",
        frozenset(
            {
                "rice",
                "roti",
                "paratha",
                "bread",
                "toast",
                "pav",
                "naan",
                "poha",
                "upma",
                "dosa",
                "idli",
                "uttapam",
                "oats",
                "porridge",
                "daliya",
                "dalia",
                "khichdi",
                "pulao",
                "biryani",
                "millet",
                "bajra",
                "jowar",
                "ragi",
                "quinoa",
                "thepla",
                "cheela",
                "makki",
                "semolina",
                "vermicelli",
                "kulcha",
                "sandwich",
            }
        ),
    ),
    ("dairy", frozenset({"curd", "milk", "lassi", "chaas", "buttermilk", "raita"})),
    (
        "vegetable",
        frozenset(
            {
                "sabzi",
                "cabbage",
                "cauliflower",
                "okra",
                "brinjal",
                "peas",
                "gourd",
                "spinach",
                "methi",
                "pumpkin",
                "potato",
                "carrot",
                "salad",
                "cucumber",
                "tomato",
                "vegetable",
                "avial",
                "poriyal",
                "thoran",
                "kootu",
                "capsicum",
                "bhaji",
                "mushroom",
                "corn",
            }
        ),
    ),
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
    item: dict,
    pool: List[Food],
    exclude_ids: set,
    query: Optional[str] = None,
    original: Optional[Food] = None,
    meal: Optional[dict] = None,
) -> List[dict]:
    """Foods that can replace ``item``, each sized to roughly its calories.

    Without a query, foods with the same role come first (a grain for a
    grain), closest in macro profile. With a query, the closest names from
    the allowed list.
    """
    current = Nutrients(**item["nutrients"])
    candidates = [
        f
        for f in pool
        if f.id not in exclude_ids and (meal is None or suits_meal(f, meal))
    ]
    if query:
        allowed = {f.id for f in candidates}
        chosen = [
            m.food for m in food_db.search(query, limit=40) if m.food.id in allowed
        ][:SWAP_LIMIT]
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

BREAKFAST_WORDS = frozenset(
    {
        "poha",
        "upma",
        "idli",
        "dosa",
        "uttapam",
        "paratha",
        "cheela",
        "oats",
        "porridge",
        "daliya",
        "dalia",
        "sandwich",
        "toast",
        "thepla",
        "dhokla",
        "semolina",
    }
)
PLAIN_GRAIN_WORDS = frozenset({"roti", "rice", "chapati"})
MAIN_GRAIN_WORDS = PLAIN_GRAIN_WORDS | frozenset(
    {"pulao", "khichdi", "millet", "bajra", "jowar", "ragi", "makki"}
)
PROTEIN_DISH_WORDS = frozenset(
    {
        "dal",
        "curry",
        "rajma",
        "chickpeas",
        "sambar",
        "bhurji",
        "paneer",
        "kadhi",
        "lobia",
        "tikka",
    }
)
DAIRY_SIDE_WORDS = frozenset({"curd", "raita", "chaas", "buttermilk"})
SNACK_PROTEIN_WORDS = frozenset(
    {"sprouted", "chickpeas", "egg", "curd", "chana", "peanut", "tofu"}
)
# Kept out of fallback plans: fried, sweet, restaurant-style or non-Indian dishes.
# Matched against the whole dish name, so numbers ("Gobi 65") count too.
FALLBACK_AVOID_WORDS = frozenset(
    {
        "sweet",
        "65",
        "fried",
        "manchurian",
        "chilli",
        "fry",
        "makhani",
        "malai",
        "shahi",
        "korma",
        "biryani",
        "curd rice",
        "milkshake",
        "mexican",
        "spanish",
        "pasta",
        "hawain",
        "hawaiian",
        "kale",
        "chinese",
        "continental",
        "pizza",
        "noodles",
    }
)
# Everyday cooked vegetables (sabzi), preferred over salads.
SABZI_WORDS = frozenset(
    {
        "sabzi",
        "cauliflower",
        "okra",
        "cabbage",
        "peas",
        "beans",
        "gourd",
        "spinach",
        "methi",
        "pumpkin",
        "avial",
        "poriyal",
        "thoran",
        "bhaji",
        "potato",
        "brinjal",
        "carrot",
        "capsicum",
    }
)

# Each slot is a list of dish kinds, filled in order; a kind with no allowed food is skipped.
FALLBACK_TEMPLATES: Dict[str, List[str]] = {
    "pre_workout": ["fruit"],
    "breakfast": ["breakfast", "dairy", "fruit"],
    "mid_morning": ["fruit"],
    "lunch": ["main_grain", "protein_dish", "vegetable_dish", "dairy_side"],
    "evening_snack": ["snack_protein", "fruit"],
    "dinner": ["main_grain", "protein_dish", "vegetable_dish"],
    "bedtime": ["milk"],
    # Ramadan: a filling sehri, iftar opened with dates, a light late meal.
    "sehri": ["main_grain", "protein_dish", "dairy_side", "fruit"],
    "iftar": ["dates", "main_grain", "protein_dish", "vegetable_dish"],
    "post_iftar": ["snack_protein", "fruit"],
}
# Vrat (Navratri, Ekadashi): fasting staples, vrat vegetables, dairy and fruit.
FAST_TEMPLATES: Dict[str, List[str]] = {
    "pre_workout": ["fruit"],
    "breakfast": ["fast_main", "dairy", "fruit"],
    "mid_morning": ["fruit"],
    "lunch": ["fast_main", "fast_sabzi", "dairy_side"],
    "evening_snack": ["fast_snack", "fruit"],
    "dinner": ["fast_main", "fast_sabzi", "dairy_side"],
    "bedtime": ["milk"],
}
# Modes whose fallback plans use the vrat templates.
VRAT_MODES = {"navratri", "ekadashi"}
FAST_MAIN_WORDS = FAST_STAPLES - {"makhana", "vrat", "farali", "phalahari"}
FAST_SABZI_WORDS = frozenset(
    {
        "potato",
        "sweet",
        "arbi",
        "colocasia",
        "yam",
        "suran",
        "pumpkin",
        "kaddu",
        "gourd",
        "lauki",
    }
)
FAST_SNACK_WORDS = frozenset(
    {"makhana", "peanut", "paneer", "curd", "chaas", "buttermilk", "almond"}
)
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
        return (
            bool(found & SNACK_PROTEIN_WORDS)
            and "curry" not in found
            and role != "grain"
        )
    if kind == "milk":
        return "milk" in found
    if kind == "dates":
        return "date" in found or "dates" in found
    if kind == "fast_main":
        return bool(found & FAST_MAIN_WORDS)
    if kind == "fast_sabzi":
        return bool(found & FAST_SABZI_WORDS) and not (found & FAST_MAIN_WORDS)
    if kind == "fast_snack":
        return bool(found & FAST_SNACK_WORDS) and role != "grain"
    return role == kind


# The plain staples people mean by "roti" and "rice".
PLAIN_GRAIN_IDS = frozenset(
    {food_db.GENERIC_ALIASES["roti"], food_db.GENERIC_ALIASES["rice"]}
)


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


def rule_based_pick(
    slots: List[dict],
    pool: List[Food],
    variant: int = 0,
    fasting_mode: Optional[str] = None,
) -> PlanPick:
    """A plan without AI: ordinary meal templates filled from the allowed foods.

    ``variant`` rotates the choices so a new plan isn't identical to the last.
    ``fasting_mode`` (a mode key such as "navratri") switches to vrat templates;
    the pool must already follow the mode's food rules.
    """
    templates = FAST_TEMPLATES if fasting_mode in VRAT_MODES else FALLBACK_TEMPLATES
    used: set = set()
    meals = []
    for slot_index, slot in enumerate(slots):
        items = []
        for kind_index, kind in enumerate(templates.get(slot["id"], ["protein"])):
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
