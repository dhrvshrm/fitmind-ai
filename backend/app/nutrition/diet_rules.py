"""Which foods a person can be offered, decided by rules rather than AI.

Every food is tagged from its name (canonical tokens, so "anda bhurji" and
"egg bhurji" tag the same). Diet type, egg and dairy answers, allergies,
intolerances, exclusions and dislikes become a set of forbidden tags and
words; a food carrying any of them is never offered in a plan.

Matching is name-based. A recipe can contain an ingredient its name doesn't
mention (onion in a curry, ghee in a dal), so the app tells people with
allergies or strict diets to check what's actually in their food.
"""
from functools import lru_cache
from typing import Dict, FrozenSet, Iterable, List, Optional, Set

from app.nutrition.food_db import Food
from app.nutrition.text import normalize, tokens

# Tag -> canonical tokens (or space-joined token phrases) that imply it.
TAG_WORDS: Dict[str, FrozenSet[str]] = {
    "meat": frozenset({
        "chicken", "mutton", "meat", "keema", "kheema", "beef", "pork", "bacon", "ham", "sausage",
        "salami", "turkey", "duck", "goat", "liver", "kaleji", "boti", "nihari", "haleem",
        "pepperoni", "meatball", "meatballs",
    }),
    "fish": frozenset({
        "fish", "prawn", "shrimp", "crab", "lobster", "jhinga", "tuna", "salmon", "seafood",
        "surmai", "pomfret", "rohu", "hilsa", "squid", "mussel", "oyster", "sardine", "mackerel",
        "bangda", "anchovy", "clam",
    }),
    "egg": frozenset({"egg", "omelette", "mayonnaise", "mayo", "meringue"}),
    "dairy": frozenset({
        "milk", "paneer", "curd", "ghee", "butter", "cheese", "cream", "khoa", "khoya", "mawa",
        "lassi", "chaas", "buttermilk", "raita", "kheer", "rabri", "rabdi", "chhena", "chena",
        "shrikhand", "kulfi", "malai", "makhani", "kadhi", "custard", "milkshake", "whey",
        "cottage", "basundi", "payasam",
    }),
    # Root vegetables, onion and garlic, which a Jain diet avoids.
    "jain_avoid": frozenset({
        "onion", "garlic", "lahsun", "lahasun", "potato", "carrot", "gajar", "beetroot", "radish",
        "mooli", "ginger", "adrak", "sweet potato", "shakarkand", "yam", "suran", "zimikand",
        "arbi", "colocasia", "turnip", "shalgam", "mushroom",
    }),
    "gluten": frozenset({
        "wheat", "atta", "maida", "roti", "paratha", "naan", "kulcha", "poori", "bread", "pav",
        "bun", "sandwich", "toast", "pasta", "spaghetti", "macaroni", "noodle", "noodles",
        "vermicelli", "semiya", "seviyan", "sevai", "semolina", "upma", "daliya", "dalia",
        "barley", "jau", "rye", "biscuit", "cookie", "cake", "pizza", "burger", "thepla",
        "bhatura", "samosa", "kachori", "mathri", "lasagne", "fettuccine", "pastry", "couscous",
        "oats", "porridge", "chapati", "phulka", "bati", "baati", "khakhra",
    }),
    "peanut": frozenset({"peanut", "groundnut", "moongphali", "mungfali"}),
    "tree_nut": frozenset({
        "almond", "badam", "cashew", "kaju", "walnut", "akhrot", "pistachio", "pista",
        "hazelnut", "pecan", "nut", "nuts",
    }),
    "soy": frozenset({"soy", "soya", "tofu", "edamame"}),
    "sesame": frozenset({"sesame", "til"}),
}

# What people type for an allergy or intolerance -> the tags it rules out.
ALLERGY_TAGS: Dict[str, FrozenSet[str]] = {
    "tree nuts": frozenset({"tree_nut"}),
    "nuts": frozenset({"peanut", "tree_nut"}),
    "peanut": frozenset({"peanut"}),
    "groundnut": frozenset({"peanut"}),
    "nut": frozenset({"peanut", "tree_nut"}),
    "tree nut": frozenset({"tree_nut"}),
    "almond": frozenset({"tree_nut"}),
    "cashew": frozenset({"tree_nut"}),
    "dairy": frozenset({"dairy"}),
    "milk": frozenset({"dairy"}),
    "lactose": frozenset({"dairy"}),
    "gluten": frozenset({"gluten"}),
    "wheat": frozenset({"gluten"}),
    "celiac": frozenset({"gluten"}),
    "coeliac": frozenset({"gluten"}),
    "egg": frozenset({"egg"}),
    "fish": frozenset({"fish"}),
    "seafood": frozenset({"fish"}),
    "shellfish": frozenset({"fish"}),
    "prawn": frozenset({"fish"}),
    "shrimp": frozenset({"fish"}),
    "soy": frozenset({"soy"}),
    "soya": frozenset({"soy"}),
    "sesame": frozenset({"sesame"}),
    "til": frozenset({"sesame"}),
}

DIET_FORBIDDEN_TAGS: Dict[str, FrozenSet[str]] = {
    "vegetarian": frozenset({"meat", "fish", "egg"}),
    "eggetarian": frozenset({"meat", "fish"}),
    "non_vegetarian": frozenset(),
    "vegan": frozenset({"meat", "fish", "egg", "dairy"}),
    "jain": frozenset({"meat", "fish", "egg", "jain_avoid"}),
}

# Sweets, condiments, fried snacks and fast food: fine to log, not plan staples.
NOT_FOR_PLANS = frozenset({
    "cake", "cookie", "biscuit", "pie", "souffle", "mousse", "pudding", "halwa", "burfi", "barfi",
    "ladoo", "laddoo", "laddu", "kheer", "ice", "icing", "pastry", "custard", "jam", "murabba",
    "preserve", "preserves", "pickle", "achar", "achaar", "chutney", "sauce", "stock", "dressing",
    "glace", "jelly", "trifle", "flan", "tart", "candy", "toffee", "chikki", "butterscotch",
    "frosting", "syrup", "squash", "punch", "cocktail", "mocktail", "muffin", "doughnut",
    "brownie", "gulab", "jalebi", "rasgulla", "sandesh", "peda", "sheera", "shrikhand", "falooda",
    "kulfi", "sundae", "marmalade", "ketchup", "dip", "mayonnaise", "vinaigrette", "pizza",
    "burger", "fries", "chips", "puff", "puffs", "pakora", "pakoda", "bhajji", "samosa",
    "kachori", "bhatura", "namkeen", "mathri", "sev", "cream", "fritter", "fritters", "praline",
    "fudge", "meringue", "loaf", "crumble", "roll", "rolls", "candied", "glazed", "macaroon",
    "eclair", "scone", "waffle", "sugar", "honey", "butter", "ghee", "oil",
    "rabri", "rabdi", "basundi", "payasam", "malpua", "ghevar", "imarti", "chocolate", "bar",
    "vada", "bonda", "poori", "cutlet", "nugget", "nuggets", "kabab", "kebab", "tikki", "powder",
})

# Everyday Indian staples, preferred when the food list has to be trimmed.
STAPLE_WORDS = frozenset({
    "dal", "roti", "rice", "sabzi", "curry", "paneer", "chickpeas", "rajma", "khichdi", "poha",
    "upma", "idli", "dosa", "sambar", "paratha", "cheela", "oats", "porridge", "daliya", "curd",
    "milk", "egg", "omelette", "bhurji", "chicken", "fish", "sprouted", "salad", "raita", "banana",
    "apple", "orange", "papaya", "mango", "guava", "peanut", "almond", "chaas", "buttermilk",
    "lassi", "tea", "coffee", "thepla", "dhokla", "uttapam", "pulao", "biryani", "kadhi", "soup",
    "toast", "bread", "tofu", "soya", "lentil", "moong", "masoor", "urad", "chana", "lobia",
    "palak", "spinach", "cauliflower", "peas", "okra", "brinjal", "cabbage", "beans", "gourd",
    "lauki", "methi", "pumpkin", "cucumber", "tomato", "mutton", "keema", "tikka", "makki",
    "bajra", "jowar", "ragi", "millet", "quinoa", "besan", "sprouts", "kidney", "stew", "rasam",
    "avial", "poriyal", "thoran", "kootu", "dalia", "vegetable",
})


def _phrase_tokens(phrase: str) -> FrozenSet[str]:
    return tokens(phrase) or frozenset(phrase.split())


def _matches(food_tokens: FrozenSet[str], words: Iterable[str]) -> bool:
    """True if every token of any word or phrase is among ``food_tokens``."""
    return any(_phrase_tokens(w) <= food_tokens for w in words)


@lru_cache(maxsize=4096)
def _food_tokens(name: str, full_name: str, aliases: tuple) -> FrozenSet[str]:
    found: Set[str] = set()
    for text in (name, full_name, *aliases):
        found |= tokens(text)
    return frozenset(found)


def food_tokens(food: Food) -> FrozenSet[str]:
    """Canonical tokens from a food's name, full name and aliases."""
    return _food_tokens(food.name, food.full_name, tuple(food.aliases))


# Plant "milks" and "butters" that aren't dairy.
PLANT_WORDS = frozenset({"coconut", "soy", "soya", "almond", "oat", "peanut", "cocoa"})


def food_tags(food: Food) -> FrozenSet[str]:
    """Diet and allergen tags a food's name implies (meat, dairy, gluten...)."""
    found = food_tokens(food)
    tags = {tag for tag, words in TAG_WORDS.items() if _matches(found, words)}
    # "Peanut butter" and "coconut milk" aren't dairy unless something else in the name is.
    if "dairy" in tags and found & PLANT_WORDS:
        if not _matches(found - {"milk", "butter", "cream"}, TAG_WORDS["dairy"]):
            tags.discard("dairy")
    return frozenset(tags)


def suitable_for_plans(food: Food) -> bool:
    """Everyday food rather than a sweet, condiment or fried snack."""
    return not (food_tokens(food) & NOT_FOR_PLANS)


def _allergy_tags(term: str) -> FrozenSet[str]:
    """Tags ruled out by an allergy as typed ("Peanuts", "lactose intolerance")."""
    norm = normalize(term)
    if norm in ALLERGY_TAGS:
        return ALLERGY_TAGS[norm]
    words = tokens(term) | set(norm.split())
    found: Set[str] = set()
    for key, tags in ALLERGY_TAGS.items():
        if set(key.split()) <= words:
            found |= tags
    return frozenset(found)


class DietRules:
    """Forbidden tags and words for one person, built from their answers."""

    def __init__(self, forbidden_tags: FrozenSet[str], forbidden_words: List[str]):
        self.forbidden_tags = forbidden_tags
        self.forbidden_words = forbidden_words

    @classmethod
    def from_preferences(cls, prefs: Optional[dict]) -> "DietRules":
        prefs = prefs or {}
        tags: Set[str] = set(DIET_FORBIDDEN_TAGS.get(prefs.get("diet_type") or "", frozenset()))
        if prefs.get("eats_eggs") is True and prefs.get("diet_type") == "vegetarian":
            tags.discard("egg")
        if prefs.get("eats_eggs") is False:
            tags.add("egg")
        if prefs.get("eats_dairy") is False:
            tags.add("dairy")

        words: List[str] = []
        for term in (prefs.get("allergies") or []) + (prefs.get("intolerances") or []):
            mapped = _allergy_tags(term)
            if mapped:
                tags |= mapped
            else:
                words.append(term)
        words += list(prefs.get("excluded") or []) + list(prefs.get("dislikes") or [])
        return cls(frozenset(tags), [w for w in words if w.strip()])

    def violations(self, food: Food) -> List[str]:
        """Why this food can't be offered (empty when it can)."""
        found = food_tokens(food)
        reasons = sorted(food_tags(food) & self.forbidden_tags)
        reasons += [w for w in self.forbidden_words if _phrase_tokens(w.lower()) <= found]
        return reasons

    def allows(self, food: Food) -> bool:
        return not self.violations(food)
