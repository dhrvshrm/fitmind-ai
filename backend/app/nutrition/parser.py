"""Turns a free-text meal description into structured food items.

"Two aloo parathas with curd" -> [2 x aloo paratha, 1 x curd]. The AI layer
does the parsing (it handles phrasing, Hinglish and implied portions well);
a rule-based parser takes over when AI is unavailable. Parsing never
produces nutrition numbers; those come from the food database.
"""
import logging
import re
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.ai import cache
from app.ai import client as ai_client
from app.ai.client import AIError
from app.nutrition.text import normalize
from app.nutrition.units import UNIT_ALIASES, UNIT_GRAMS, is_piece_unit, normalize_unit

logger = logging.getLogger(__name__)

# A whole day described at once (breakfast, lunch, dinner and snacks) fits in this.
MAX_ITEMS = 30
# Bump whenever the parse prompt changes, so cached parses from the old prompt are ignored.
PARSE_PROMPT_VERSION = 3

MealType = Literal["breakfast", "lunch", "dinner", "snack"]


class ParsedItem(BaseModel):
    """One food in a meal description, before nutrition lookup."""

    name: str = Field(..., min_length=1, max_length=80)
    quantity: Optional[float] = Field(None, gt=0, le=3000)  # Large values are grams or ml.
    unit: Optional[str] = Field(None, max_length=30)
    preparation: Optional[str] = Field(None, max_length=80)
    # Which meal it belonged to and when, when the description says so.
    meal_type: Optional[MealType] = None
    eaten_at: Optional[str] = Field(None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")

    @field_validator("name")
    @classmethod
    def _clean_name(cls, value: str) -> str:
        return " ".join(value.split())


class ParsedMeal(BaseModel):
    items: List[ParsedItem] = Field(..., min_length=1, max_length=MAX_ITEMS)


_PARSE_SYSTEM_PROMPT = (
    "You split meal descriptions written by people in India into individual foods. "
    "You never estimate nutrition; you only identify foods, quantities and units."
)

_PARSE_INSTRUCTIONS = """Split this meal description into foods.

Rules:
- One item per separately eaten food. Split combinations eaten as separate dishes:
  "rajma chawal" -> rajma curry + rice; "dal chawal" -> dal + rice; "chole bhature" -> chole + bhatura;
  "vada pav" -> batata vada (potato) + pav; "pav bhaji" -> pav bhaji (the bhaji) + pav.
- Name the specific regional dish when the combination implies it: the vada in vada pav is a
  batata vada, the vada in sambar vada or medu vada is an urad dal vada.
- Keep single dishes whole: "masala dosa", "aloo paratha", "chicken biryani", "paneer bhurji".
- Put add-ons on their own line when they add real calories: "cheese pav bhaji" -> pav bhaji + pav + cheese.
- quantity is a number (use 0.5 for half). Leave quantity and unit null when the text doesn't say.
- unit is a household unit when given: piece, bowl, katori, plate, glass, cup, tbsp, tsp, slice, g, ml,
  or the item itself for countable foods (roti, paratha, idli, dosa, egg).
- name: the food in plain words, common Indian name preferred, no quantity in it.
- preparation: cooking style only if stated (fried, grilled, with butter, less oil), else null.
- The text may describe several meals or a whole day, possibly in Hinglish ("subah nashte mein",
  "dopahar ko", "raat ko", "shaam ko"). Set meal_type on every item when the text says or clearly
  implies which meal it was: breakfast, lunch, dinner, or snack (tea-time, evening snacks, in between).
  Leave meal_type null if the text gives no meal at all.
- eaten_at: 24-hour "HH:MM" only when a time is stated ("at 5 pm" -> "17:00"), else null.
- Ignore words that aren't food (greetings, "today I had", "so far").

Example: "2 rotis, dal and a bowl of rice" ->
{"items": [{"name": "roti", "quantity": 2, "unit": "roti", "preparation": null, "meal_type": null, "eaten_at": null},
           {"name": "dal", "quantity": null, "unit": null, "preparation": null, "meal_type": null, "eaten_at": null},
           {"name": "rice", "quantity": 1, "unit": "bowl", "preparation": null, "meal_type": null, "eaten_at": null}]}

Example: "breakfast mein poha, lunch was rajma chawal and at 5 pm a samosa" ->
{"items": [{"name": "poha", "quantity": null, "unit": null, "preparation": null, "meal_type": "breakfast", "eaten_at": null},
           {"name": "rajma curry", "quantity": null, "unit": null, "preparation": null, "meal_type": "lunch", "eaten_at": null},
           {"name": "rice", "quantity": null, "unit": null, "preparation": null, "meal_type": "lunch", "eaten_at": null},
           {"name": "samosa", "quantity": 1, "unit": "samosa", "preparation": null, "meal_type": "snack", "eaten_at": "17:00"}]}

Meal description: """


async def parse_meal(text: str, user_id: Optional[str] = None) -> List[ParsedItem]:
    """Parse ``text`` with AI, falling back to rules when AI is unavailable."""
    try:
        result = await ai_client.generate_json(
            _PARSE_INSTRUCTIONS + text,
            ParsedMeal,
            system=_PARSE_SYSTEM_PROMPT,
            temperature=0.1,
            user_id=user_id,
            # Meal text isn't personal data; identical descriptions reuse the parse.
            cache_key=cache.make_key(f"meal-parse-v{PARSE_PROMPT_VERSION}", text),
        )
        return result.items
    except AIError as e:
        logger.info("AI meal parse unavailable, using rule-based parser: %s", e)
        return parse_meal_rules(text)


# --- Rule-based fallback ---------------------------------------------------

_NUMBER_WORDS = {
    "a": 1, "an": 1, "one": 1, "ek": 1, "single": 1,
    "two": 2, "do": 2, "couple": 2,
    "three": 3, "teen": 3, "four": 4, "char": 4, "chaar": 4,
    "five": 5, "paanch": 5, "panch": 5, "six": 6, "chhe": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "half": 0.5, "aadha": 0.5, "adha": 0.5,
}
_SPLIT_PATTERN = re.compile(r",|;|\+|&|\band\b|\bwith\b|\bplus\b|\baur\b|\bsath\b")
_UNIT_WORDS = sorted(set(UNIT_GRAMS) | set(UNIT_ALIASES), key=len, reverse=True)
# Countable units that are measures, not foods ("2 slices bread", "1 piece cake").
_MEASURE_UNITS = {"piece", "slice", "scoop", "triangle"}


def _quantity(word: str) -> Optional[float]:
    if word in _NUMBER_WORDS:
        return float(_NUMBER_WORDS[word])
    if re.fullmatch(r"\d+(\.\d+)?", word):
        return float(word)
    if re.fullmatch(r"\d+/\d+", word):
        num, den = word.split("/")
        return float(num) / float(den) if float(den) else None
    return None


def _parse_chunk(chunk: str) -> Optional[ParsedItem]:
    words = normalize(chunk).replace(" of ", " ").split()
    words = [w for w in words if w not in {"had", "ate", "i", "today", "some"}]
    if not words:
        return None
    quantity = _quantity(words[0])
    if quantity is not None:
        words = words[1:]
    unit = None
    rest = " ".join(words)
    for candidate in _UNIT_WORDS:
        if rest == candidate or rest.startswith(candidate + " "):
            remainder = rest[len(candidate):].strip()
            canonical = normalize_unit(candidate)
            # "2 bowls rice" -> unit bowl. Countable foods stay part of the name:
            # "2 rotis" is roti x2 and "vada pav" is a dish, not pav in vada units.
            if remainder and canonical and (canonical in _MEASURE_UNITS or not is_piece_unit(canonical)):
                unit, rest = canonical, remainder
            break
    if not rest:
        return None
    return ParsedItem(name=rest[:80], quantity=quantity, unit=unit)


# Words that start a new meal in a whole-day description, in English and Hinglish.
_MEAL_MARKERS = {
    "breakfast": "breakfast", "nashta": "breakfast", "nashte": "breakfast", "subah": "breakfast",
    "morning": "breakfast",
    "lunch": "lunch", "dopahar": "lunch", "afternoon": "lunch",
    "dinner": "dinner", "raat": "dinner", "night": "dinner", "supper": "dinner",
    "snack": "snack", "snacks": "snack", "shaam": "snack", "evening": "snack",
}
_MEAL_MARKER_PATTERN = re.compile(r"\b(" + "|".join(_MEAL_MARKERS) + r")\b", re.IGNORECASE)
# Filler that sits between a meal word and the food ("for lunch I had", "mein", "ko").
_FILLER_PATTERN = re.compile(
    r"\b(for|in|at|was|were|had|i|ate|then|mein|me|ko|ke|liye|tha|thi|maine|khaya|khayi|li)\b",
    re.IGNORECASE,
)


def _segments(text: str) -> List[tuple]:
    """Split a whole-day description into (meal_type or None, text) segments."""
    parts = _MEAL_MARKER_PATTERN.split(text)
    segments = [(None, parts[0])]
    for i in range(1, len(parts), 2):
        segments.append((_MEAL_MARKERS[parts[i].lower()], parts[i + 1] if i + 1 < len(parts) else ""))
    return segments


def parse_meal_rules(text: str) -> List[ParsedItem]:
    """Split on meal words and separators; read a leading number and unit from each part."""
    items: List[ParsedItem] = []
    for meal_type, segment in _segments(text):
        segment = _FILLER_PATTERN.sub(" ", segment)
        for chunk in _SPLIT_PATTERN.split(segment):
            item = _parse_chunk(chunk)
            if item:
                items.append(item.model_copy(update={"meal_type": meal_type}))
    if not items:
        items = [ParsedItem(name=" ".join(text.split())[:80] or "meal")]
    return items[:MAX_ITEMS]
