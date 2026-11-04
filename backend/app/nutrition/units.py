"""Household portion units and their typical weights.

Indian meals are described in pieces, katoris and plates rather than grams.
These defaults convert a unit to grams when a food has no reliable serving
weight of its own. Values are typical home portions and are always shown to
the user as editable estimates.
"""
from typing import Dict, Optional

# Canonical unit -> typical grams (or ml for drinks, treated as ~1 g/ml).
UNIT_GRAMS: Dict[str, float] = {
    # Mass and volume
    "g": 1,
    "ml": 1,
    "tbsp": 15,
    "tsp": 5,
    # Containers
    "bowl": 150,
    "small bowl": 100,
    "soup bowl": 200,
    "plate": 250,
    "cup": 150,
    "tea cup": 120,
    "glass": 250,
    "tall glass": 300,
    # Pieces
    "piece": 50,
    "roti": 40,
    "chapati": 40,
    "paratha": 90,
    "poori": 30,
    "dosa": 100,
    "idli": 45,
    "vada": 50,
    "samosa": 90,
    "cutlet": 60,
    "pav": 40,
    "slice": 30,
    "egg": 50,
    "sandwich": 120,
    "biscuit": 10,
    "cookie": 15,
    "ladoo": 40,
    "burfi": 30,
    "kabab": 40,
    "cheela": 70,
    "pancake": 60,
    "triangle": 50,
    "scoop": 30,
}

# Spoken and regional names for the units above.
UNIT_ALIASES: Dict[str, str] = {
    "gm": "g", "gms": "g", "gram": "g", "grams": "g", "gr": "g",
    "millilitre": "ml", "milliliter": "ml",
    "tablespoon": "tbsp", "tablespoons": "tbsp", "spoon": "tbsp", "chammach": "tbsp",
    "teaspoon": "tsp", "teaspoons": "tsp",
    "katori": "bowl", "katoris": "bowl", "bowls": "bowl", "curry bowl": "bowl", "dish": "bowl",
    "plates": "plate", "thali": "plate",
    "cups": "cup", "mug": "cup",
    "glasses": "glass",
    "pieces": "piece", "pc": "piece", "pcs": "piece", "nos": "piece", "no": "piece", "unit": "piece",
    "rotis": "roti", "phulka": "roti", "chapatis": "chapati", "chapattis": "chapati",
    "parantha": "paratha", "parathas": "paratha", "paranthas": "paratha",
    "pooris": "poori", "puri": "poori", "puris": "poori",
    "dosas": "dosa", "idlis": "idli", "vadas": "vada", "samosas": "samosa",
    "cutlets": "cutlet", "slices": "slice", "large slice": "slice", "toasted triangle": "triangle",
    "eggs": "egg", "sandwiches": "sandwich", "biscuits": "biscuit", "cookies": "cookie",
    "ladoos": "ladoo", "laddu": "ladoo", "laddoo": "ladoo",
    "kababs": "kabab", "kebab": "kabab", "kebabs": "kabab",
    "pancakes": "pancake", "cheelas": "cheela", "scoops": "scoop",
}

# A food's own serving weight above this is treated as unreliable (some
# source recipes list the whole batch as one serving).
MAX_PLAUSIBLE_GRAMS: Dict[str, float] = {
    "piece": 250,
    "bowl": 250,
    "small bowl": 150,
    "soup bowl": 300,
    "plate": 400,
    "cup": 250,
    "tea cup": 180,
    "glass": 300,
    "tall glass": 350,
    "tbsp": 25,
    "tsp": 10,
}

# ...and below this it's treated as a data error rather than a light food.
MIN_PLAUSIBLE_GRAMS = {"piece": 5, "container": 30}

# Units that describe a single countable item.
_PIECE_UNITS = {u for u, g in UNIT_GRAMS.items() if u not in {
    "g", "ml", "tbsp", "tsp", "bowl", "small bowl", "soup bowl", "plate",
    "cup", "tea cup", "glass", "tall glass", "scoop",
}}


def normalize_unit(unit: Optional[str]) -> Optional[str]:
    """Map a free-text unit to its canonical name, or None if unknown/empty."""
    if not unit:
        return None
    cleaned = " ".join(unit.lower().strip().split())
    cleaned = UNIT_ALIASES.get(cleaned, cleaned)
    return cleaned if cleaned in UNIT_GRAMS else None


def is_piece_unit(unit: str) -> bool:
    """True for countable units (roti, idli, piece...) as opposed to containers."""
    return unit in _PIECE_UNITS


def default_grams(unit: str) -> float:
    """Typical grams for one ``unit`` (assumes ``unit`` is canonical)."""
    return UNIT_GRAMS.get(unit, UNIT_GRAMS["piece"])


def plausible_serving(unit: str, grams: float) -> bool:
    """True if ``grams`` is a believable weight for one ``unit``.

    Containers are volumes, so their weight depends on the food (a katori of
    poha weighs far less than a katori of dal); a recipe's own serving weight
    is kept whenever it falls in a believable range for the unit.
    """
    piece = is_piece_unit(unit)
    cap = MAX_PLAUSIBLE_GRAMS.get("piece" if piece else unit)
    floor = MIN_PLAUSIBLE_GRAMS["piece" if piece else "container"]
    if unit in ("g", "ml"):
        return grams > 0
    return grams >= floor and (cap is None or grams <= cap)
