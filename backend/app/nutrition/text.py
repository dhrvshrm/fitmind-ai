"""Text normalisation for matching food names across spellings and languages.

"Aloo ka paratha", "aloo parantha" and "potato parathas" should all reduce to
the same tokens, so matching works on canonical tokens rather than raw text.
"""
import re
from typing import FrozenSet

# Hindi/regional words and spelling variants -> one canonical token.
SYNONYMS = {
    "parantha": "paratha", "parathas": "paratha", "paranthas": "paratha", "parotta": "paratha",
    "chapati": "roti", "chapatti": "roti", "chapatis": "roti", "rotis": "roti", "phulka": "roti",
    "phulkas": "roti",
    "dahi": "curd", "yogurt": "curd", "yoghurt": "curd",
    "chawal": "rice", "bhaat": "rice", "bhat": "rice",
    "aloo": "potato", "alu": "potato", "aalu": "potato", "aaloo": "potato", "potatoes": "potato",
    "batata": "potato",
    "panir": "paneer", "pannir": "paneer",
    "chapathi": "roti", "chappati": "roti", "chapathis": "roti",
    "parotha": "paratha", "prantha": "paratha", "paratta": "paratha",
    "idly": "idli", "idlies": "idli", "dosai": "dosa", "dosha": "dosa",
    "sambhar": "sambar", "saambar": "sambar",
    "biryanis": "biryani", "briyani": "biryani",
    "dahee": "curd", "dhahi": "curd",
    "upama": "upma", "pohe": "poha", "pauva": "poha",
    "anda": "egg", "ande": "egg", "eggs": "egg",
    "chai": "tea",
    "daal": "dal", "dhal": "dal",
    "pyaaz": "onion", "pyaz": "onion", "kanda": "onion",
    "gobi": "cauliflower", "gobhi": "cauliflower",
    "palak": "spinach",
    "matar": "peas", "mattar": "peas", "pea": "peas",
    "chana": "chickpeas", "channa": "chickpeas", "chole": "chickpeas", "chhole": "chickpeas",
    "chickpea": "chickpeas",
    "rajmah": "rajma", "kidney": "rajma",
    "bhindi": "okra", "ladyfinger": "okra",
    "baingan": "brinjal", "eggplant": "brinjal",
    "murgh": "chicken", "murg": "chicken",
    "gosht": "mutton", "lamb": "mutton",
    "machli": "fish", "machhi": "fish",
    "doodh": "milk",
    "sabji": "sabzi", "subzi": "sabzi", "sabjee": "sabzi",
    "biriyani": "biryani", "biriani": "biryani",
    "khichri": "khichdi", "khitchdi": "khichdi", "khichadi": "khichdi",
    "omlet": "omelette", "omelet": "omelette", "omlette": "omelette",
    "idlis": "idli", "dosas": "dosa", "vadas": "vada", "wada": "vada",
    "samosas": "samosa", "pooris": "poori", "puri": "poori", "puris": "poori",
    "chilla": "cheela", "chila": "cheela",
    "suji": "semolina", "rava": "semolina", "sooji": "semolina",
    "besan": "gram flour",
    "makhan": "butter",
    "kheera": "cucumber",
    "veg": "vegetable", "vegetables": "vegetable", "veggies": "vegetable",
    "sprouts": "sprouted", "sprout": "sprouted",
}

# Words that carry no identity for matching.
STOPWORDS = frozenset({
    "a", "an", "the", "and", "with", "of", "in", "on", "ka", "ki", "ke", "aur", "wala", "wali",
    "style", "homemade", "home", "made", "some", "my", "fresh", "plain", "simple", "normal",
    "regular", "one", "serving", "portion",
})


def normalize(text: str) -> str:
    """Lowercase, drop punctuation and collapse whitespace."""
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9%\s]", " ", text)
    return " ".join(text.split())


def _singular(word: str) -> str:
    """Drop a plural "s" from longer words ("parathas" -> "paratha", not "dal" -> "da")."""
    if len(word) > 4 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def tokens(text: str) -> FrozenSet[str]:
    """Canonical content tokens of ``text`` (synonyms merged, stopwords dropped)."""
    out = set()
    for word in normalize(text).split():
        if word in STOPWORDS or word.isdigit():
            continue
        word = SYNONYMS.get(word) or SYNONYMS.get(_singular(word)) or _singular(word)
        for part in word.split():
            if part not in STOPWORDS:
                out.add(part)
    return frozenset(out)
