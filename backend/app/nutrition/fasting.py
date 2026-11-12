"""Fasting and festival modes: Navratri, Ekadashi, Jain Paryushan and Ramadan.

A mode is switched on by the person for dates they choose (we never guess
festival dates, which depend on the local calendar and moon sighting). While
it is on, its food rules join the person's diet rules in ``DietRules``, so
plans, swaps and logging warnings all follow it the same way they follow an
allergy. Ramadan doesn't restrict foods; it changes meal times instead
(sehri before dawn, iftar at sunset and a light meal later).

Rules are name-based, like the rest of ``diet_rules``: "Samak rice khichdi"
is a fasting dish even though it says "rice", because a fasting staple in
the name wins over the grain word. Practices differ between families and
regions, so plans made in a mode always say so and ask people to follow
their own tradition.
"""
from dataclasses import dataclass, field
from typing import Dict, FrozenSet, List, Optional

# Fasting staples. A dish named after one of these is fasting food even if
# the name also has a grain word ("samak rice", "kuttu roti", "sago khichdi").
FAST_STAPLES = frozenset({
    "sago", "sabudana", "kuttu", "buckwheat", "singhara", "rajgira", "amaranth", "samak",
    "sama", "barnyard", "makhana", "vrat", "farali", "phalahari",
})

GRAIN_WORDS = frozenset({
    "rice", "wheat", "atta", "maida", "roti", "paratha", "naan", "kulcha", "poori", "bread",
    "pav", "bun", "toast", "sandwich", "pasta", "spaghetti", "macaroni", "noodle", "noodles",
    "vermicelli", "semiya", "seviyan", "semolina", "upma", "poha", "idli", "dosa", "uttapam",
    "oats", "porridge", "daliya", "dalia", "barley", "millet", "bajra", "jowar", "ragi", "makki",
    "corn", "maize", "quinoa", "khichdi", "pulao", "biryani", "thepla", "cheela", "biscuit",
    "cake", "cookie", "pizza", "burger", "bhatura", "kachori", "samosa", "mathri", "khakhra",
    "chapati", "phulka", "bati", "baati", "muffin", "pancake", "cracked",
})
PULSE_WORDS = frozenset({
    "dal", "lentil", "lentils", "moong", "masoor", "urad", "toor", "arhar", "chickpeas", "rajma",
    "lobia", "peas", "soya", "soy", "tofu", "sprouted", "gram", "sambar", "kadhi", "dhokla",
    "beans", "bean", "edamame", "hummus", "vada",
})
ONION_GARLIC_WORDS = frozenset({"onion", "garlic", "lahsun", "lahasun", "shallot", "leek"})

# What a Navratri or Ekadashi dish is built on: at least one must be in the name.
VRAT_FOUNDATION_WORDS = FAST_STAPLES | frozenset({
    "potato", "sweet", "shakarkand", "arbi", "colocasia", "yam", "suran", "zimikand", "pumpkin",
    "kaddu", "gourd", "lauki", "cucumber", "milk", "curd", "paneer", "lassi", "chaas",
    "buttermilk", "raita", "khoa", "khoya", "makhana", "peanut", "groundnut", "almond", "cashew",
    "walnut", "nut", "nuts", "coconut", "date", "dates", "banana", "apple", "orange", "mango",
    "papaya", "guava", "grape", "grapes", "pomegranate", "watermelon", "melon", "pear", "chikoo",
    "pineapple", "fruit", "tea", "coffee",
})

TIMING_NORMAL = "normal"
TIMING_RAMADAN = "ramadan"

# Ramadan meal times when the person hasn't given their local dawn and sunset.
DEFAULT_DAWN = "05:00"
DEFAULT_SUNSET = "18:30"


@dataclass(frozen=True)
class FastingMode:
    """One mode's food and timing rules."""

    key: str
    # Days it usually lasts; the app suggests this as the end date.
    usual_days: int
    max_days: int
    # Diet-rule tags a food may not carry (see ``diet_rules.TAG_WORDS``).
    forbidden_tags: FrozenSet[str] = frozenset()
    # Words a food's name may not contain (fasting staples excuse grain words).
    forbidden_words: FrozenSet[str] = frozenset()
    # When set, a food's name needs at least one of these.
    foundation_words: Optional[FrozenSet[str]] = None
    timing: str = TIMING_NORMAL
    # Extra instructions for the AI planner.
    prompt: str = ""
    # Plan note codes shown while the mode is on (besides "fasting_mode").
    note_codes: List[str] = field(default_factory=list)
    # Foods put first in the planner's list while the mode is on.
    preferred_words: FrozenSet[str] = frozenset()

    @property
    def single_day(self) -> bool:
        return self.max_days == 1

    @property
    def restricts_food(self) -> bool:
        return bool(self.forbidden_tags or self.forbidden_words or self.foundation_words)

    def violations(self, food_tokens: FrozenSet[str]) -> List[str]:
        """Why a food (by its canonical name tokens) breaks this fast. Tags are checked
        by ``DietRules`` with the person's other forbidden tags."""
        reason = f"fast_{self.key}"
        words = food_tokens - GRAIN_WORDS if food_tokens & FAST_STAPLES else food_tokens
        if words & self.forbidden_words:
            return [reason]
        if self.foundation_words is not None and not food_tokens & self.foundation_words:
            return [reason]
        return []


_VRAT_PROMPT = (
    "Today is a {name} fast (vrat). Only fasting foods: sabudana, kuttu, singhara, rajgira, "
    "samak rice, potatoes and other vrat vegetables, dairy, fruit and nuts. No grains, pulses, "
    "onion, garlic, meat or eggs. Food is cooked with sendha namak. The food list already "
    "follows these rules. Keep meals simple and filling, and get protein from curd, paneer, "
    "milk, makhana and peanuts."
)

MODES: Dict[str, FastingMode] = {
    "navratri": FastingMode(
        key="navratri",
        usual_days=9,
        max_days=10,
        forbidden_tags=frozenset({"meat", "fish", "egg"}),
        forbidden_words=GRAIN_WORDS | PULSE_WORDS | ONION_GARLIC_WORDS,
        foundation_words=VRAT_FOUNDATION_WORDS,
        prompt=_VRAT_PROMPT.format(name="Navratri"),
        note_codes=["fasting_salt"],
        preferred_words=FAST_STAPLES,
    ),
    "ekadashi": FastingMode(
        key="ekadashi",
        usual_days=1,
        max_days=1,
        forbidden_tags=frozenset({"meat", "fish", "egg"}),
        forbidden_words=GRAIN_WORDS | PULSE_WORDS | ONION_GARLIC_WORDS,
        foundation_words=VRAT_FOUNDATION_WORDS,
        prompt=_VRAT_PROMPT.format(name="Ekadashi"),
        note_codes=["fasting_salt"],
        preferred_words=FAST_STAPLES,
    ),
    "paryushan": FastingMode(
        key="paryushan",
        usual_days=8,
        max_days=10,
        forbidden_tags=frozenset({"meat", "fish", "egg", "jain_avoid"}),
        forbidden_words=ONION_GARLIC_WORDS | frozenset({"honey"}),
        prompt=(
            "The person is observing Jain Paryushan: no onion, garlic, potatoes or other root "
            "vegetables, no meat, fish, eggs or honey. The food list already follows these rules. "
            "Keep meals simple, home-style and satvik."
        ),
        note_codes=["paryushan_practice"],
    ),
    "ramadan": FastingMode(
        key="ramadan",
        usual_days=30,
        max_days=31,
        timing=TIMING_RAMADAN,
        prompt=(
            "The person is fasting for Ramadan: nothing to eat or drink between dawn and sunset. "
            "Sehri (before dawn) should be filling and slow to digest: whole grains, protein, "
            "curd and fruit, not too salty. Iftar (at sunset) opens the fast, with dates or fruit "
            "first and then a normal meal. The late meal is light."
        ),
        note_codes=["ramadan_timings"],
        preferred_words=frozenset({"date", "dates"}),
    ),
}


def get_mode(key: Optional[str]) -> Optional[FastingMode]:
    return MODES.get(key or "")


def catalogue() -> List[dict]:
    """The modes the app offers, for the settings screen."""
    return [
        {
            "key": m.key,
            "usual_days": m.usual_days,
            "max_days": m.max_days,
            "single_day": m.single_day,
            "timing": m.timing,
        }
        for m in MODES.values()
    ]
