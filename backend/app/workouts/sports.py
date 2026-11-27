"""Training for a sport: what to strengthen, how to stay injury-free, and match weeks.

Each sport adds:
- extra strength slots for what the sport demands (single-leg strength and
  hamstrings for football, calves for running, rotation and shoulders for cricket);
- conditioning and injury-prevention drills on sport days, written as plain
  instructions (sprints, agility, Copenhagen planks), not catalogue exercises;
- a season phase: off-season builds strength (up to four days), pre-season
  adds conditioning (three strength days), in-season keeps strength short and
  fresh (two days, a set less) so practice and matches come first;
- a match day: no strength the day before or on the day, and a recovery walk
  the day after.

Evidence: Nordic hamstring curls roughly halve hamstring injuries in football
(van der Horst 2015; van Dyk 2019 meta-analysis); the Copenhagen adduction
exercise cuts groin problems (Haroy 2019); FIFA 11+ style warm-ups reduce injury
rates (Thorborg 2017 meta-analysis); strength training improves running economy
(Balsalobre-Fernandez 2016 meta-analysis).
"""
from typing import Dict, List, Optional, Tuple

SPORTS = ("football", "cricket", "running", "badminton", "basketball", "kabaddi", "tennis", "swimming")
PHASES = ("off_season", "pre_season", "in_season")
NO_SPORT = "none"

# Strength days a week by phase (never more than the person picked).
STRENGTH_DAYS = {"off_season": 4, "pre_season": 3, "in_season": 2}
# Endurance athletes train their sport most days: strength stays at three days at most.
SPORT_MAX_STRENGTH_DAYS = {"running": 3, "swimming": 3}
# In season the goal is keeping strength, which takes about a third of the volume that
# builds it (Bickel 2011; Spiering 2021): weekly hard sets per muscle to aim for.
MAINTENANCE_VOLUME = [4, 10]
# In season, strength work is a set shorter so legs are fresh for practice.
IN_SEASON_SET_CUT = 1
MIN_SETS = 2

# Extra strength slots per sport: (session kinds they join, patterns, best first).
LOWER = ("lower", "legs", "full")
UPPER = ("upper", "push", "pull", "full")
ANY = ("lower", "legs", "full", "upper", "push", "pull")

SLOTS: Dict[str, List[Tuple[Tuple[str, ...], List[str]]]] = {
    "football": [(LOWER, ["knee_flexion"]), (LOWER, ["lunge"]), (LOWER, ["calf"])],
    "cricket": [(ANY, ["core"]), (UPPER, ["rear_delt"]), (LOWER, ["lunge"])],
    "running": [(LOWER, ["calf"]), (LOWER, ["lunge"]), (LOWER, ["hinge"])],
    "badminton": [(LOWER, ["lunge"]), (LOWER, ["calf"]), (UPPER, ["rear_delt"])],
    "basketball": [(LOWER, ["calf"]), (LOWER, ["lunge"]), (ANY, ["core"])],
    "kabaddi": [(LOWER, ["hinge"]), (UPPER, ["pull_horizontal"]), (ANY, ["core"])],
    "tennis": [(ANY, ["core"]), (UPPER, ["rear_delt"]), (LOWER, ["lunge"])],
    "swimming": [(UPPER, ["pull_vertical"]), (UPPER, ["rear_delt"]), (ANY, ["core"])],
}

# Sport-day drills: (name, dose, what it is for).
DRILLS: Dict[str, List[Tuple[str, str, str]]] = {
    "football": [
        ("Dynamic warm-up", "10 min: jog, skips, side shuffles, leg swings", "FIFA 11+ style warm-up, fewer injuries"),
        ("Sprints", "6 x 30 m at 90%, walk back", "speed"),
        ("5-10-5 shuttle", "6 reps, full rest", "agility and changing direction"),
        ("Copenhagen plank", "3 x 20 s each side", "groin injury prevention"),
        ("Single-leg balance, eyes closed", "3 x 30 s each leg", "ankle stability"),
    ],
    "cricket": [
        ("Dynamic warm-up", "8 min: jog, arm circles, lunges with a twist", "ready to bowl and bat"),
        ("Sprints between wickets", "8 x 20 m, turn and go", "running between wickets"),
        ("Rotational throws", "3 x 8 each side with a medicine ball or backpack", "bat speed and throwing"),
        ("Band shoulder external rotation", "3 x 15 each arm", "shoulder health for bowlers and fielders"),
        ("Side plank", "3 x 30 s each side", "trunk strength for bowling"),
    ],
    "running": [
        ("Easy run", "25 to 40 min at a pace you can talk at", "aerobic base"),
        ("Strides", "6 x 20 s fast but relaxed, walk back", "speed and form"),
        ("Single-leg calf raises", "3 x 15 each leg", "Achilles and calf resilience"),
        ("Walking lunges", "2 x 10 each leg", "single-leg strength"),
    ],
    "badminton": [
        ("Shadow footwork", "6 x 30 s to all six corners", "court movement"),
        ("Lateral bounds", "3 x 8 each side", "explosive side-to-side push"),
        ("Split-step jumps", "3 x 20", "first-step speed"),
        ("Band shoulder external rotation", "3 x 15 each arm", "shoulder health for smashes"),
    ],
    "basketball": [
        ("Jump practice", "4 x 5 jumps, full rest", "vertical jump"),
        ("Defensive slides", "6 x 15 s", "lateral speed"),
        ("Court sprints", "6 x baseline to half court", "repeat speed"),
        ("Single-leg landings", "3 x 6 each leg, stick the landing", "knee and ankle injury prevention"),
    ],
    "kabaddi": [
        ("Bear crawls", "4 x 10 m", "low strength and grip on the mat"),
        ("Lateral shuffles", "6 x 15 s", "raiding footwork"),
        ("Towel or partner pulls", "4 x 20 s", "holding and pulling strength"),
        ("Neck isometrics", "3 x 15 s each direction, gentle", "neck protection in tackles"),
    ],
    "tennis": [
        ("Shadow swings with footwork", "6 x 30 s", "movement into the shot"),
        ("Lateral bounds", "3 x 8 each side", "side-to-side power"),
        ("Rotational throws", "3 x 8 each side with a medicine ball or backpack", "racket speed"),
        ("Band shoulder external rotation", "3 x 15 each arm", "shoulder health for serves"),
    ],
    "swimming": [
        ("Pool technique session", "30 to 45 min, drills then steady laps", "stroke efficiency"),
        ("Band pull-aparts", "3 x 15", "shoulder blade control"),
        ("Dead bug", "3 x 10 each side", "streamline core strength"),
    ],
}

INJURY_NOTES: Dict[str, str] = {
    "football": "Hamstring curls (Nordic curls once you are strong enough) and Copenhagen planks cut the most common football injuries.",
    "cricket": "Rotation, shoulder and trunk work protect the back and shoulders of bowlers and fielders.",
    "running": "Calf and single-leg strength make running cheaper on the legs and help keep the Achilles and knees healthy.",
    "badminton": "Lunges, calves and shoulder work match the deep lunges and overhead shots of badminton.",
    "basketball": "Calves, single-leg strength and good landings protect knees and ankles.",
    "kabaddi": "Hips, back, pulling strength and neck work prepare you for tackles and holds.",
    "tennis": "Rotation, shoulder and lunge work match the serve and the sprint to the ball.",
    "swimming": "Back and shoulder strength balance all the pulling in the water.",
}


def setup_of(raw: Optional[dict]) -> Optional[dict]:
    """The person's sport setup, or None when they don't play one."""
    raw = raw or {}
    sport = raw.get("sport")
    if sport not in SPORTS:
        return None
    phase = raw.get("phase") if raw.get("phase") in PHASES else "off_season"
    match_day = raw.get("match_day")
    match_day = match_day if isinstance(match_day, int) and 0 <= match_day <= 6 else None
    return {"sport": sport, "phase": phase, "match_day": match_day}


def strength_days(setup: dict, chosen: int) -> int:
    cap = min(STRENGTH_DAYS[setup["phase"]], SPORT_MAX_STRENGTH_DAYS.get(setup["sport"], 7))
    return max(1, min(chosen, cap))


def extra_slots(setup: dict, session: str) -> List[List[str]]:
    """Sport slots that join this kind of session."""
    return [patterns for kinds, patterns in SLOTS[setup["sport"]] if session in kinds]


def drills(setup: dict) -> List[dict]:
    """A sport day: conditioning and injury-prevention drills as plan entries."""
    return [
        {"exercise_id": None, "name": name, "sets": 1, "reps": dose, "rest": "as needed",
         "difficulty": "medium", "pattern": "conditioning", "effort": purpose}
        for name, dose, purpose in DRILLS[setup["sport"]]
    ]


def blocked_days(setup: dict) -> set:
    """Days strength training stays away from: the match and the day before."""
    match = setup.get("match_day")
    if match is None:
        return set()
    return {match, (match - 1) % 7}


# What to eat around a match: carbs early, light and familiar food close to kick-off
# (ISSN and IOC consensus on carbohydrate around competition).
MATCH_DAY_PROMPT = (
    "Today is a match day: put most of the day's carbs in a familiar meal 3 to 4 hours before the "
    "match (rice, roti, poha, banana), keep that meal low in fat and fibre, add a small carb snack "
    "about an hour before, and plan a protein and carb meal after the match."
)
PRE_MATCH_PROMPT = (
    "Tomorrow is a match: make today's meals a little higher in carbs (rice, roti, fruit) and keep "
    "dinner familiar and easy to digest."
)


def match_status(setup: Optional[dict], weekday: int) -> Optional[str]:
    """"match" on match day, "pre_match" the day before, else None."""
    if not setup or setup.get("match_day") is None:
        return None
    if weekday == setup["match_day"]:
        return "match"
    if weekday == (setup["match_day"] - 1) % 7:
        return "pre_match"
    return None
