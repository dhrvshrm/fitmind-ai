"""In-memory food composition database and name matching.

Loads the curated datasets in ``app/nutrition/data`` once:
- INDB (Indian Nutrient Databank, 2024): prepared Indian dishes.
- USDA FoodData Central: plain staples (curd, milk, eggs, fruit...).

Datasets are small (under 1,000 foods), so search runs in memory with token
matching; no database round trip is needed. A user's own foods are searched
alongside these by the estimator.
"""
import json
import logging
from difflib import SequenceMatcher, get_close_matches
from functools import lru_cache
from pathlib import Path
from typing import Dict, FrozenSet, List, Optional

from pydantic import BaseModel

from app.nutrition.text import SYNONYMS, normalize, tokens
from app.nutrition.units import default_grams, is_piece_unit, normalize_unit

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
DATASET_FILES = ("indb_foods.json", "usda_basics.json")

# A match must score at least this to be used without asking the user.
MATCH_THRESHOLD = 0.8
# Weaker matches are still offered as "did you mean" alternatives.
SUGGESTION_THRESHOLD = 0.45

# What people usually mean by a bare generic word -> a specific dataset entry.
GENERIC_ALIASES: Dict[str, str] = {
    "dal": "indb:ASC155",
    "dal tadka": "indb:ASC155",
    "moong dal": "indb:ASC151",
    "masoor dal": "indb:ASC157",
    "rice": "indb:ASC113",
    "steamed rice": "indb:ASC113",
    "roti": "indb:ASC096",
    "tea": "indb:ASC001",
    "omelette": "indb:ASC061",
    "rajma": "indb:ASC165",
    "rajma curry": "indb:ASC165",
    "paratha": "indb:ASC097",
    "dosa": "indb:BFP148",
    "idli": "indb:ASC144",
    "sambar": "indb:ASC167",
    "poha": "indb:BFP044",
    "egg curry": "indb:BFP240",
    "curd rice": "indb:ASC126",
    "veg biryani": "indb:ASC123",
    "pulao": "indb:ASC114",
    "pav bhaji": "indb:OSR112",
    "chole": "indb:ASC162",
    "chana masala": "indb:ASC162",
    "upma": "indb:BFP039",
    "coffee": "indb:ASC002",
    "raita": "indb:ASC273",
    "veg pulao": "indb:ASC115",
    "sprouts salad": "indb:ASC259",
}

NUTRIENT_KEYS = ("kcal", "protein", "carbs", "fat", "fiber")


class Nutrients(BaseModel):
    """Energy (kcal) and macros (g)."""

    kcal: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: float = 0

    def scaled(self, factor: float) -> "Nutrients":
        """Return these nutrients multiplied by ``factor``, rounded for display."""
        return Nutrients(**{k: round(getattr(self, k) * factor, 1) for k in NUTRIENT_KEYS})

    def plus(self, other: "Nutrients") -> "Nutrients":
        return Nutrients(**{k: round(getattr(self, k) + getattr(other, k), 1) for k in NUTRIENT_KEYS})


class Serving(BaseModel):
    """Default portion for a food: one ``unit`` weighs ``grams``."""

    unit: str
    grams: float
    from_source: bool = False


class Food(BaseModel):
    """One food from a composition dataset (or a user's own food)."""

    id: str
    name: str
    full_name: str = ""
    aliases: List[str] = []
    source: str
    per_100g: Nutrients
    serving: Serving


class FoodMatch(BaseModel):
    food: Food
    score: float


class _Entry:
    """A food with its precomputed token sets (name and each alias)."""

    def __init__(self, food: Food, names: List[str]):
        self.food = food
        self.names = [(normalize(n), tokens(n)) for n in names if n]


@lru_cache(maxsize=1)
def _index() -> List[_Entry]:
    """Load every dataset once and build the search index."""
    entries: List[_Entry] = []
    by_id: Dict[str, _Entry] = {}
    for filename in DATASET_FILES:
        path = DATA_DIR / filename
        if not path.exists():
            logger.info("Food dataset %s not found; skipping", filename)
            continue
        for raw in json.loads(path.read_text(encoding="utf-8")):
            food = Food(**raw)
            entry = _Entry(food, [food.name, *food.aliases])
            entries.append(entry)
            by_id[food.id] = entry
    for alias, food_id in GENERIC_ALIASES.items():
        if food_id in by_id:
            by_id[food_id].names.append((normalize(alias), tokens(alias)))
    logger.info("Loaded %d foods", len(entries))
    return entries


def get_food(food_id: str) -> Optional[Food]:
    """Return a dataset food by id."""
    return next((e.food for e in _index() if e.food.id == food_id), None)


def name_score(query: str, candidate: str) -> float:
    """Similarity (0-1) between a query and a candidate name.

    Rewards explaining all of the query (coverage) and penalises candidates
    with many extra words (so "dal" doesn't match "dal paratha"). An exact
    normalised match scores 1.
    """
    q_norm, c_norm = normalize(query), normalize(candidate)
    if q_norm == c_norm:
        return 1.0
    return _token_score(q_norm, tokens(query), c_norm, tokens(candidate))


# Words that describe how a dish is made or topped rather than which dish it
# is. Unmatched, they count for little, so "aloo butter paratha" still finds
# "Potato paratha" (the estimator adds the butter as its own item).
MODIFIER_WORDS = frozenset({
    "butter", "ghee", "oil", "cheese", "masala", "spicy", "extra", "less", "fried", "tadka",
    "desi", "hot", "crispy", "jain", "special", "street", "restaurant", "dhaba", "small", "large",
    "big", "full", "medium",
})
MODIFIER_WEIGHT = 0.3


def _weight(token: str) -> float:
    return MODIFIER_WEIGHT if token in MODIFIER_WORDS else 1.0


def _token_score(q_norm: str, q_tokens, c_norm: str, c_tokens) -> float:
    if q_norm == c_norm:
        return 1.0
    if not q_tokens or not c_tokens:
        return 0.0
    if q_tokens == c_tokens:
        return 0.97
    shared = q_tokens & c_tokens
    if not shared:
        return SequenceMatcher(None, q_norm, c_norm).ratio() * 0.5
    coverage = sum(_weight(t) for t in shared) / sum(_weight(t) for t in q_tokens)
    specificity = len(shared) / len(c_tokens)
    return round(coverage * (0.5 + 0.5 * specificity), 3)


@lru_cache(maxsize=1)
def _vocabulary() -> Dict[str, str]:
    """Every word the matcher knows -> its canonical token.

    Includes the canonical tokens of all dataset names and every synonym
    spelling, so a typo can be corrected toward either.
    """
    vocab: Dict[str, str] = {}
    for entry in _index():
        for _, name_tokens in entry.names:
            for token in name_tokens:
                vocab[token] = token
    for spelling, canonical in SYNONYMS.items():
        vocab.setdefault(spelling, canonical)
    return vocab


# How similar (0-1) an unknown word must be to a known one to be treated as a typo of it.
TYPO_CUTOFF = 0.8
MIN_TYPO_LENGTH = 4


def correct_tokens(query_tokens: FrozenSet[str]) -> FrozenSet[str]:
    """Replace misspelled words with the closest known word ("parahtna" -> "paratha").

    Only words the matcher doesn't know are touched, and only when a known
    word is very close, so real but unfamiliar foods aren't forced into a match.
    """
    vocab = _vocabulary()
    corrected = set()
    for token in query_tokens:
        if token in vocab or len(token) < MIN_TYPO_LENGTH:
            corrected.add(vocab.get(token, token))
            continue
        close = get_close_matches(token, vocab.keys(), n=1, cutoff=TYPO_CUTOFF)
        corrected.update(vocab[close[0]].split() if close else [token])
    return frozenset(corrected)


def search(query: str, limit: int = 5) -> List[FoodMatch]:
    """Best dataset matches for ``query``, highest score first (typos tolerated)."""
    q_norm, q_tokens = normalize(query), correct_tokens(tokens(query))
    scored = []
    for entry in _index():
        best = max((_token_score(q_norm, q_tokens, n, t) for n, t in entry.names), default=0)
        if best >= SUGGESTION_THRESHOLD:
            scored.append(FoodMatch(food=entry.food, score=best))
    # Prefer dataset foods with real serving weights when scores tie.
    scored.sort(key=lambda m: (m.score, m.food.serving.from_source), reverse=True)
    return scored[:limit]


def grams_for(food: Food, quantity: Optional[float], unit: Optional[str]) -> float:
    """Convert a quantity in some unit into grams of ``food``.

    No unit means "servings" of the food's own default unit. A countable unit
    on a countable food ("2 parathas") uses the food's own piece weight.
    """
    qty = quantity if quantity and quantity > 0 else 1
    canonical = normalize_unit(unit)
    if canonical is None:
        return round(qty * food.serving.grams, 1)
    if canonical in ("g", "ml"):
        return round(qty, 1)
    if canonical == food.serving.unit or (
        is_piece_unit(canonical) and is_piece_unit(food.serving.unit)
    ):
        return round(qty * food.serving.grams, 1)
    return round(qty * default_grams(canonical), 1)
