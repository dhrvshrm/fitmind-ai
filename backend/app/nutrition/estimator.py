"""Meal text -> nutrition, preferring real composition data over AI guesses.

For each parsed item:
1. The user's own foods, then the curated datasets (INDB, USDA), are
   searched. A confident match gives verified per-100 g values.
2. Quantity and unit are converted to grams (household defaults when the
   text gives no amount, flagged as assumed so the UI can ask).
3. Only when nothing matches does the AI estimate the item. Those values
   are validated for internal consistency and labelled as estimates.
4. If AI is unavailable too, the item is returned unresolved so the user
   can enter values themselves. Nothing is ever made up silently.
"""
import logging
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator

from app.ai import cache
from app.ai import client as ai_client
from app.ai.client import AIError, AIQuotaError
from app.config.settings import get_settings
from app.nutrition import food_db
from app.nutrition.food_db import Food, Nutrients
from app.nutrition.parser import ParsedItem, parse_meal
from app.nutrition.text import normalize, tokens
from app.nutrition.units import normalize_unit

logger = logging.getLogger(__name__)

ItemSource = Literal["INDB", "USDA", "custom", "estimate", "ai_estimate", "unresolved"]
# Why an item couldn't be estimated, so the app can say what to do about it.
UnresolvedReason = Literal["ai_not_configured", "ai_quota", "ai_failed"]
Confidence = Literal["high", "medium", "low"]

# Bump whenever the estimate prompt or schema changes, so old cached estimates are ignored.
ESTIMATE_PROMPT_VERSION = 3

# Sources whose numbers come from a published dataset or the user themselves.
VERIFIED_SOURCES = {"INDB", "USDA", "custom"}

# How far an AI estimate may plausibly be off, by its confidence: shown as a range.
RANGE_BY_CONFIDENCE = {"high": 0.1, "medium": 0.2, "low": 0.3}
# An AI estimate this much denser (kcal per 100 g) than the closest similar food in
# the datasets is flagged for the person to check.
SIMILAR_MIN_SCORE = 0.5
SIMILAR_MAX_RATIO = 1.35
# Above this density only fats, nuts, sweets and fried snacks belong.
DENSE_KCAL_PER_100G = 450
DENSE_WORDS = frozenset({
    "oil", "ghee", "butter", "nut", "nuts", "almond", "almonds", "cashew", "cashews", "peanut",
    "peanuts", "walnut", "walnuts", "pista", "chocolate", "chips", "namkeen", "bhujia", "mixture",
    "sev", "chakli", "mathri", "cookie", "cookies", "biscuit", "biscuits", "seeds", "halwa",
    "ladoo", "laddoo", "barfi", "burfi", "pinni", "chikki", "coconut", "cheese", "mayonnaise",
})
# Grams beyond which a stated container sounds larger than any normal serving.
LARGE_PORTION_GRAMS = {"bowl": 400, "small bowl": 250, "plate": 500, "glass": 450, "cup": 350}

# Why an estimate asks to be checked (the app words it).
CheckReason = Literal["higher_than_similar", "very_dense", "large_portion"]


class Alternative(BaseModel):
    food_id: str
    name: str
    score: float


class EstimatedItem(BaseModel):
    """One food in an estimated meal, ready to review and edit before saving."""

    query: str
    name: str
    food_id: Optional[str] = None
    source: ItemSource
    verified: bool
    quantity: float
    unit: str
    grams: float
    quantity_assumed: bool
    nutrients: Optional[Nutrients] = None
    # Lets the client rescale nutrients when the user edits the grams.
    per_100g: Optional[Nutrients] = None
    confidence: Confidence
    note: Optional[str] = None
    unresolved_reason: Optional[UnresolvedReason] = None
    # Which meal and time the description put this food in (for whole-day logging).
    meal_type: Optional[str] = None
    eaten_at: Optional[str] = None
    alternatives: List[Alternative] = []
    # For AI estimates: the plausible range of calories, given the confidence.
    kcal_low: Optional[float] = None
    kcal_high: Optional[float] = None
    # Set when an AI estimate looks off against the datasets, with what it was compared to.
    check: Optional[CheckReason] = None
    similar_name: Optional[str] = None
    similar_kcal_per_100g: Optional[float] = None


class MealEstimate(BaseModel):
    text: str
    items: List[EstimatedItem]
    totals: Nutrients
    unresolved_count: int


class _AIFoodEstimate(BaseModel):
    """The model's estimate for one food; rejected if internally inconsistent."""

    grams: float = Field(..., gt=0, le=2000)
    kcal: float = Field(..., ge=0, le=3000)
    protein: float = Field(..., ge=0, le=300)
    carbs: float = Field(..., ge=0, le=400)
    fat: float = Field(..., ge=0, le=300)
    fiber: float = Field(0, ge=0, le=100)
    # Drinks get most of their energy from alcohol (7 kcal/g), not macros.
    alcohol: float = Field(0, ge=0, le=300)
    confidence: Confidence
    assumption: str = Field("", max_length=200)

    @model_validator(mode="after")
    def _energy_matches_macros(self) -> "_AIFoodEstimate":
        from_macros = 4 * self.protein + 4 * self.carbs + 9 * self.fat + 7 * self.alcohol
        if abs(self.kcal - from_macros) > 0.3 * max(self.kcal, from_macros) + 20:
            raise ValueError(
                f"kcal {self.kcal} doesn't match 4*protein + 4*carbs + 9*fat + 7*alcohol "
                f"= {from_macros:.0f}"
            )
        return self


_ESTIMATE_SYSTEM_PROMPT = (
    "You are a nutritionist estimating the nutrition of foods as typically prepared in Indian "
    "homes and restaurants. Be realistic about oil, ghee and portion sizes. Give the median, "
    "typical value, not the upper end of a range: people log real meals and an overestimate is "
    "as wrong as an underestimate. When unsure, give your best typical estimate and lower the "
    "confidence rather than refusing."
)

# Standard weights so "a katori" or "one samosa" means the same thing every time.
_PORTION_GUIDE = (
    "Typical Indian weights: 1 katori or bowl of dal, sabzi or curry is about 150 g; 1 plate of "
    "rice about 250 g; 1 roti about 40 g; 1 paratha about 80 g; 1 samosa about 80 g; 1 kachori "
    "about 60-70 g; 1 idli about 40 g; 1 dosa about 100 g; 1 slice of bread about 30 g; 1 glass "
    "about 250 ml; 1 cup of tea about 150 ml. Cooked dishes are mostly 80-250 kcal per 100 g; "
    "only fried snacks, sweets, nuts and fats go above 350."
)


def _display_unit(item: ParsedItem, food: Optional[Food]) -> str:
    unit = normalize_unit(item.unit)
    if unit:
        return unit
    if food:
        return food.serving.unit
    return "serving"


def _alternatives(matches, exclude_id: Optional[str] = None) -> List[Alternative]:
    return [
        Alternative(food_id=m.food.id, name=m.food.name, score=m.score)
        for m in matches
        if m.food.id != exclude_id
    ][:3]


def from_food(item: ParsedItem, food: Food, score: float, matches) -> EstimatedItem:
    """Build an item from a matched dataset (or user) food."""
    grams = food_db.grams_for(food, item.quantity, item.unit)
    return EstimatedItem(
        query=item.name,
        name=food.name,
        food_id=food.id,
        # Hand-built estimates (a few fasting dishes) keep their label and aren't verified.
        source=food.source if food.source in VERIFIED_SOURCES | food_db.ESTIMATE_SOURCES else "custom",
        verified=food.source not in food_db.ESTIMATE_SOURCES,
        quantity=item.quantity or 1,
        unit=_display_unit(item, food),
        grams=grams,
        quantity_assumed=item.quantity is None,
        nutrients=food.per_100g.scaled(grams / 100),
        per_100g=food.per_100g,
        confidence="high" if score >= 0.95 else "medium",
        alternatives=_alternatives(matches, food.id),
    )


async def _ai_estimate(item: ParsedItem, user_id: Optional[str]) -> _AIFoodEstimate:
    amount = (
        f"{item.quantity:g} {item.unit or 'serving(s)'}" if item.quantity else
        f"one typical {item.unit or 'serving'}"
    )
    prep = f" ({item.preparation})" if item.preparation else ""
    prompt = (
        f"Food: {item.name}{prep}\nAmount eaten: {amount}\n\n"
        f"{_PORTION_GUIDE}\n\n"
        "Give the total grams for that amount and its calories (kcal), protein, carbs, fat, "
        "fiber and alcohol in grams (alcohol is 0 unless it's an alcoholic drink). confidence is "
        "high, medium or low. assumption briefly states the portion and preparation you assumed, "
        "in plain words."
    )
    return await ai_client.generate_json(
        prompt,
        _AIFoodEstimate,
        system=_ESTIMATE_SYSTEM_PROMPT,
        temperature=0.2,
        user_id=user_id,
        cache_key=cache.make_key(
            f"food-estimate-v{ESTIMATE_PROMPT_VERSION}", item.name, item.preparation or "", amount
        ),
    )


async def estimate_item(
    item: ParsedItem,
    user_id: Optional[str] = None,
    user_foods: Optional[List[Food]] = None,
) -> EstimatedItem:
    """Resolve one parsed item to nutrition (see module docstring for the order)."""
    for food in user_foods or []:
        score = max(food_db.name_score(item.name, n) for n in [food.name, *food.aliases])
        if score >= food_db.MATCH_THRESHOLD:
            return from_food(item, food, score, [])

    matches = food_db.search(item.name)
    if matches and matches[0].score >= food_db.MATCH_THRESHOLD:
        return from_food(item, matches[0].food, matches[0].score, matches)

    try:
        estimate = await _ai_estimate(item, user_id)
    except AIError as e:
        logger.info("No match and no AI estimate for %r: %s", item.name, e)
        return EstimatedItem(
            unresolved_reason=_unresolved_reason(e),
            query=item.name,
            name=item.name,
            source="unresolved",
            verified=False,
            quantity=item.quantity or 1,
            unit=_display_unit(item, None),
            grams=0,
            quantity_assumed=item.quantity is None,
            confidence="low",
            alternatives=_alternatives(matches),
        )

    nutrients = Nutrients(
        kcal=round(estimate.kcal, 1),
        protein=round(estimate.protein, 1),
        carbs=round(estimate.carbs, 1),
        fat=round(estimate.fat, 1),
        fiber=round(estimate.fiber, 1),
    )
    return EstimatedItem(
        query=item.name,
        name=item.name,
        source="ai_estimate",
        verified=False,
        quantity=item.quantity or 1,
        unit=_display_unit(item, None),
        grams=round(estimate.grams, 1),
        quantity_assumed=item.quantity is None,
        nutrients=nutrients,
        per_100g=nutrients.scaled(100 / estimate.grams),
        confidence=estimate.confidence,
        note=estimate.assumption or None,
        alternatives=_alternatives(matches),
        **plausibility(item, estimate.grams, nutrients.kcal, estimate.confidence, matches),
    )


def plausibility(item: ParsedItem, grams: float, kcal: float, confidence: str, matches) -> dict:
    """A range for an AI estimate, and a reason to check it when it looks off.

    Nothing is changed: the person sees the estimate, how sure it is, and, when it
    is much denser than a similar food in the datasets, oddly dense for what it is,
    or a very large portion for the container named, a prompt to check it.
    """
    spread = RANGE_BY_CONFIDENCE.get(confidence, 0.3)
    result: dict = {"kcal_low": round(kcal * (1 - spread)), "kcal_high": round(kcal * (1 + spread))}
    density = kcal * 100 / grams if grams else 0
    similar = next((m for m in matches if m.score >= SIMILAR_MIN_SCORE
                    and m.food.id not in food_db.UNRELIABLE_IDS), None)
    unit = normalize_unit(item.unit)
    if similar and density > similar.food.per_100g.kcal * SIMILAR_MAX_RATIO:
        result.update(check="higher_than_similar", similar_name=similar.food.name,
                      similar_kcal_per_100g=round(similar.food.per_100g.kcal))
    elif density > DENSE_KCAL_PER_100G and not (tokens(item.name) & DENSE_WORDS):
        result["check"] = "very_dense"
    elif unit in LARGE_PORTION_GRAMS and item.quantity:
        if grams / item.quantity > LARGE_PORTION_GRAMS[unit]:
            result["check"] = "large_portion"
    return result


def _unresolved_reason(error: AIError) -> UnresolvedReason:
    settings = get_settings()
    if not (settings.GEMINI_API_KEY or settings.GROQ_API_KEY):
        return "ai_not_configured"
    if isinstance(error, AIQuotaError):
        return "ai_quota"
    return "ai_failed"


def totals(items: List[EstimatedItem]) -> Nutrients:
    total = Nutrients()
    for item in items:
        if item.nutrients:
            total = total.plus(item.nutrients)
    return total


# Toppings that add real calories to breads ("butter paratha", "ghee roti",
# "cheese dosa"): (food to log, unit, amount per piece of bread).
ADDONS = {
    "butter": ("butter", "tsp", 1.0),
    "ghee": ("ghee", "tsp", 1.0),
    "cheese": ("cheese slice", "slice", 1.0),
}
# Only split toppings off breads; "butter chicken" is a dish, not chicken plus butter.
ADDON_BASES = frozenset({
    "paratha", "roti", "naan", "kulcha", "toast", "bread", "pav", "dosa", "sandwich",
    "poori", "thepla", "uttapam", "cheela",
})


def split_addons(item: ParsedItem) -> List[ParsedItem]:
    """Split "2 butter parathas" into 2 parathas + 2 tsp butter (amount assumed)."""
    words = normalize(item.name).split()
    item_tokens = food_db.correct_tokens(tokens(item.name))
    addons = [w for w in words if food_db.correct_tokens(tokens(w)) & ADDONS.keys()]
    if not addons or not (item_tokens & ADDON_BASES):
        return [item]
    base_name = " ".join(w for w in words if w not in addons)
    pieces = item.quantity or 1
    split = [item.model_copy(update={"name": base_name})]
    for word in dict.fromkeys(addons):
        key = next(iter(food_db.correct_tokens(tokens(word)) & ADDONS.keys()))
        food_name, unit, per_piece = ADDONS[key]
        split.append(ParsedItem(
            name=food_name,
            quantity=pieces * per_piece,
            unit=unit,
            meal_type=item.meal_type,
            eaten_at=item.eaten_at,
        ))
    return split


ADDON_NOTE = "Amount assumed from the description. Change it if you used more or less."


async def estimate_meal(
    text: str,
    user_id: Optional[str] = None,
    user_foods: Optional[List[Food]] = None,
) -> MealEstimate:
    """Parse ``text`` and resolve every item to nutrition."""
    parsed = await parse_meal(text, user_id)
    items: List[EstimatedItem] = []
    for original in parsed:
        for index, part in enumerate(split_addons(original)):
            item = await estimate_item(part, user_id, user_foods)
            item.meal_type, item.eaten_at = part.meal_type, part.eaten_at
            if index > 0:  # A topping split off a bread: its amount is our assumption.
                item.quantity_assumed = True
                item.note = item.note or ADDON_NOTE
            items.append(item)
    return MealEstimate(
        text=text,
        items=items,
        totals=totals(items),
        unresolved_count=sum(1 for i in items if i.source == "unresolved"),
    )
