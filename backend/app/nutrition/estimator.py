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

ItemSource = Literal["INDB", "USDA", "custom", "ai_estimate", "unresolved"]
# Why an item couldn't be estimated, so the app can say what to do about it.
UnresolvedReason = Literal["ai_not_configured", "ai_quota", "ai_failed"]
Confidence = Literal["high", "medium", "low"]

# Sources whose numbers come from a published dataset or the user themselves.
VERIFIED_SOURCES = {"INDB", "USDA", "custom"}


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
    alternatives: List[Alternative] = []


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
    confidence: Confidence
    assumption: str = Field("", max_length=200)

    @model_validator(mode="after")
    def _energy_matches_macros(self) -> "_AIFoodEstimate":
        from_macros = 4 * self.protein + 4 * self.carbs + 9 * self.fat
        if abs(self.kcal - from_macros) > 0.3 * max(self.kcal, from_macros) + 20:
            raise ValueError(
                f"kcal {self.kcal} doesn't match macros (4P+4C+9F = {from_macros:.0f})"
            )
        return self


_ESTIMATE_SYSTEM_PROMPT = (
    "You are a nutritionist estimating the nutrition of foods as typically prepared in Indian "
    "homes and restaurants. Be realistic about oil, ghee and portion sizes. When unsure, give "
    "your best typical estimate and lower the confidence rather than refusing."
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
        source=food.source if food.source in VERIFIED_SOURCES else "custom",
        verified=True,
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
        "Give the total grams for that amount and its calories (kcal), protein, carbs, fat and "
        "fiber in grams. confidence is high, medium or low. assumption briefly states the portion "
        "and preparation you assumed, in plain words."
    )
    return await ai_client.generate_json(
        prompt,
        _AIFoodEstimate,
        system=_ESTIMATE_SYSTEM_PROMPT,
        temperature=0.2,
        user_id=user_id,
        cache_key=cache.make_key("food-estimate", item.name, item.preparation or "", amount),
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
    )


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
        split.append(ParsedItem(name=food_name, quantity=pieces * per_piece, unit=unit))
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
