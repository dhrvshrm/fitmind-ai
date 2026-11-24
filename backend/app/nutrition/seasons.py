"""What is in season where someone lives, for meal plans.

The region a person types ("Srinagar", "Kerala", "Pune") maps to a climate zone,
and the zone plus today's month gives a season. Fruits and vegetables in season
there are preferred; ones out of season are moved to the back of the food list
(never banned: frozen peas and cold-stored apples are fine in any month).

Seasons: summer, monsoon, winter, and "mild" for the months in between, when
nothing is pushed back. "Taseer" (thanda and garam foods) is a traditional
belief, not evidence, and is applied only when a person switches it on.
"""
import json
import re
from dataclasses import dataclass, field
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Dict, FrozenSet, List, Optional, Tuple

from app.nutrition.text import tokens

DATA_FILE = Path(__file__).parent / "data" / "seasonal_produce.json"

ZONE_COLD_HILL = "cold_hill"
ZONE_NORTH = "north"
ZONE_WEST = "west"
ZONE_EAST = "east"
ZONE_SOUTH = "south"
SEASON_MILD = "mild"

# Places, most specific first: "Jammu and Kashmir" is a cold hill region, but the
# city of Jammu is in the hot plains.
ZONE_PLACES: List[Tuple[str, Tuple[str, ...]]] = [
    (ZONE_COLD_HILL, (
        "kashmir", "srinagar", "anantnag", "baramulla", "sopore", "gulmarg", "pahalgam", "kupwara",
        "pulwama", "budgam", "ganderbal", "shopian", "kulgam", "bandipora", "ladakh", "leh", "kargil",
        "himachal", "shimla", "manali", "dharamshala", "dharamsala", "kullu", "solan", "chamba",
        "kinnaur", "spiti", "lahaul", "mcleodganj", "sikkim", "gangtok", "darjeeling", "kalimpong",
        "mussoorie", "nainital", "almora", "pithoragarh", "auli", "tawang",
    )),
    (ZONE_SOUTH, (
        "kerala", "kochi", "cochin", "ernakulam", "thiruvananthapuram", "trivandrum", "kozhikode",
        "calicut", "thrissur", "tamil nadu", "chennai", "madras", "coimbatore", "madurai", "trichy",
        "salem", "karnataka", "bangalore", "bengaluru", "mysore", "mysuru", "mangalore", "mangaluru",
        "hubli", "andhra", "visakhapatnam", "vizag", "vijayawada", "guntur", "tirupati", "telangana",
        "hyderabad", "secunderabad", "warangal", "puducherry", "pondicherry", "ooty",
    )),
    (ZONE_WEST, (
        "maharashtra", "mumbai", "bombay", "pune", "nagpur", "nashik", "thane", "navi mumbai",
        "aurangabad", "kolhapur", "gujarat", "ahmedabad", "surat", "vadodara", "baroda", "rajkot",
        "gandhinagar", "goa", "panaji",
    )),
    (ZONE_EAST, (
        "west bengal", "bengal", "kolkata", "calcutta", "siliguri", "howrah", "odisha", "orissa",
        "bhubaneswar", "cuttack", "assam", "guwahati", "meghalaya", "shillong", "tripura", "agartala",
        "manipur", "imphal", "mizoram", "aizawl", "nagaland", "kohima",
    )),
    (ZONE_NORTH, (
        "delhi", "ncr", "noida", "gurgaon", "gurugram", "ghaziabad", "faridabad", "punjab",
        "chandigarh", "amritsar", "ludhiana", "jalandhar", "patiala", "mohali", "haryana", "uttar pradesh",
        "lucknow", "kanpur", "agra", "varanasi", "banaras", "prayagraj", "allahabad", "meerut", "bihar",
        "patna", "gaya", "rajasthan", "jaipur", "jodhpur", "udaipur", "kota", "bikaner", "ajmer",
        "madhya pradesh", "bhopal", "indore", "gwalior", "jabalpur", "jammu", "uttarakhand",
        "dehradun", "haridwar", "rishikesh", "jharkhand", "ranchi", "jamshedpur", "chhattisgarh",
        "raipur",
    )),
]

# Month -> season, per zone.
_SEASON_MONTHS: Dict[str, Dict[str, Tuple[int, ...]]] = {
    ZONE_NORTH: {"winter": (11, 12, 1, 2), "summer": (4, 5, 6), "monsoon": (7, 8, 9)},
    ZONE_COLD_HILL: {"winter": (11, 12, 1, 2, 3), "summer": (6, 7, 8)},
    ZONE_WEST: {"winter": (12, 1, 2), "summer": (3, 4, 5), "monsoon": (6, 7, 8, 9)},
    ZONE_EAST: {"winter": (12, 1, 2), "summer": (3, 4, 5), "monsoon": (6, 7, 8, 9)},
    # The south has no real winter; the northeast monsoon wets Oct-Nov.
    ZONE_SOUTH: {"summer": (3, 4, 5), "monsoon": (6, 7, 8, 9, 10, 11)},
}

# How a pool score changes: in season pulls a food forward, out of season sends it back.
IN_SEASON_BONUS = 2
TASEER_PENALTY = 4


@dataclass(frozen=True)
class Produce:
    key: str
    name: str
    words: Tuple[FrozenSet[str], ...]
    seasons: Dict[str, Tuple[str, ...]]
    soft: bool
    local_only: bool

    def seasons_in(self, zone: str) -> Tuple[str, ...]:
        if zone in self.seasons:
            return self.seasons[zone]
        return self.seasons["default"]

    def matches(self, food_tokens: FrozenSet[str]) -> bool:
        return any(phrase <= food_tokens for phrase in self.words)


@dataclass(frozen=True)
class SeasonContext:
    """The season where someone lives, and what that means for their plan."""

    zone: str
    season: str
    region: str
    in_season: Tuple[Produce, ...]
    out_of_season: Tuple[Produce, ...]
    taseer_avoid: Tuple[FrozenSet[str], ...] = field(default=())

    def is_out_of_season(self, food_tokens: FrozenSet[str]) -> bool:
        return any(p.matches(food_tokens) for p in self.out_of_season)

    def is_in_season(self, food_tokens: FrozenSet[str]) -> bool:
        return any(p.matches(food_tokens) for p in self.in_season)

    def against_taseer(self, food_tokens: FrozenSet[str]) -> bool:
        return any(phrase <= food_tokens for phrase in self.taseer_avoid)

    def score(self, food_tokens: FrozenSet[str]) -> int:
        """Pool score change: in season is preferred; against taseer (when on) is pushed down."""
        score = IN_SEASON_BONUS if self.is_in_season(food_tokens) else 0
        if self.against_taseer(food_tokens):
            score -= TASEER_PENALTY
        return score

    def summary(self) -> dict:
        """What the plan stores, to tell when the season or place has changed."""
        return {"zone": self.zone, "season": self.season}

    def prompt_lines(self) -> List[str]:
        """Planner instructions in plain words."""
        lines = []
        if self.in_season:
            lines.append(
                f"It is {self.season} where they live ({self.region}). Prefer fruits and vegetables in "
                f"season there: {', '.join(p.name.lower() for p in self.in_season)}."
            )
        if self.out_of_season:
            lines.append(
                "These are out of season there and hard to find fresh, so avoid them: "
                f"{', '.join(p.name.lower() for p in self.out_of_season)}. Staples like dal, rice, roti, "
                "potato, onion and tomato are fine all year."
            )
        if self.taseer_avoid:
            lines.append("They follow taseer (traditional thanda and garam foods): " + TASEER_PROMPTS[self.season])
        return lines


TASEER_PROMPTS = {
    "winter": "in winter, skip cooling foods like cucumber, watermelon, chaas, lassi and raita.",
    "summer": "in summer, skip heating foods like bajra, jaggery, til and dates.",
}


def _phrases(words: List[str]) -> Tuple[FrozenSet[str], ...]:
    return tuple(t for t in (tokens(w) for w in words) if t)


@lru_cache(maxsize=1)
def _data() -> Tuple[Tuple[Produce, ...], Dict[str, dict]]:
    raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    produce = []
    for item in raw["produce"]:
        seasons = {"default": tuple(item["seasons"])}
        for zone in (ZONE_SOUTH, ZONE_COLD_HILL):
            if zone in item:
                seasons[zone] = tuple(item[zone])
        produce.append(Produce(
            key=item["key"], name=item["name"], words=_phrases(item["words"]), seasons=seasons,
            soft=bool(item.get("soft")), local_only=bool(item.get("local_only")),
        ))
    return tuple(produce), raw["taseer"]


def zone_for(region: Optional[str]) -> Optional[str]:
    """The climate zone of a typed place, or None when it isn't a known Indian place."""
    if not region:
        return None
    text = " " + re.sub(r"[^a-z]+", " ", region.lower()) + " "
    for zone, places in ZONE_PLACES:
        if any(f" {place} " in text for place in places):
            return zone
    return None


def season_for(zone: str, today: date) -> str:
    for season, months in _SEASON_MONTHS[zone].items():
        if today.month in months:
            return season
    return SEASON_MILD


def context_for(region: Optional[str], today: date, follow_taseer: bool = False) -> Optional[SeasonContext]:
    """The season where someone lives, or None when the place is unknown."""
    zone = zone_for(region)
    if zone is None:
        return None
    season = season_for(zone, today)
    produce, taseer = _data()
    in_season, out_of_season = [], []
    for item in produce:
        seasons = item.seasons_in(zone)
        if season in seasons:
            if not (item.local_only and zone not in item.seasons):
                in_season.append(item)
        elif season != SEASON_MILD and not item.soft and not (item.local_only and zone not in item.seasons):
            out_of_season.append(item)
    avoid: Tuple[FrozenSet[str], ...] = ()
    if follow_taseer:
        avoid = tuple(p for kind in taseer.values() if season in kind["avoid_in"] for p in _phrases(kind["words"]))
    return SeasonContext(
        zone=zone, season=season, region=region.strip(), in_season=tuple(in_season),
        out_of_season=tuple(out_of_season), taseer_avoid=avoid,
    )
