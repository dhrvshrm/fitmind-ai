"""Weekly workout plans and quick sessions from the curated catalogue.

No AI is involved. The week's structure (which days, which split) comes
from training days per week; each session is a list of movement-pattern
slots (squat, hinge, push, pull, core...) filled with exercises the person
can do (equipment, injuries, level), rotated across the week for variety.
Sets, reps and rest come from ``programming``.
"""
from collections import Counter
from typing import Dict, List, Optional, Sequence

from app.workouts import catalog, programming
from app.workouts.catalog import Exercise

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Training days per week -> (weekday index, session type).
SPLITS: Dict[int, List[tuple]] = {
    1: [(2, "full")],
    2: [(0, "full"), (3, "full")],
    3: [(0, "full"), (2, "full"), (4, "full")],
    4: [(0, "upper"), (1, "lower"), (3, "upper"), (4, "lower")],
    5: [(0, "upper"), (1, "lower"), (3, "upper"), (4, "lower"), (5, "full")],
    6: [(0, "push"), (1, "pull"), (2, "legs"), (3, "push"), (4, "pull"), (5, "legs")],
}
MIN_PULLS_FOR_PULL_DAY = 2
SIX_DAYS_WITHOUT_PULL = [(0, "upper"), (1, "lower"), (2, "full"), (3, "upper"), (4, "lower"), (5, "full")]
DEFAULT_DAYS = {"beginner": 3, "intermediate": 4, "advanced": 5}

# Each slot lists acceptable patterns, best first.
PULL = ["pull_horizontal", "pull_vertical", "rear_delt"]
SESSIONS: Dict[str, List[List[str]]] = {
    # Two pulls to the two pushes, so the back keeps up with chest and shoulders.
    "full": [["squat", "lunge"], ["push_horizontal"], ["hinge", "glute"], PULL,
             ["pull_vertical", "pull_horizontal", "rear_delt"], ["push_vertical", "shoulder_isolation"],
             ["lunge", "glute"], ["core"]],
    # Two chest presses (flat and incline) so chest gets as much work as back and shoulders.
    "upper": [["push_horizontal"], ["pull_horizontal", "pull_vertical"], ["push_vertical"],
              ["pull_vertical", "pull_horizontal"], ["push_horizontal"],
              # Rear delts before side raises: the presses already work the front of the
              # shoulder, and desk-bound backs need the pulling more.
              ["rear_delt", "shoulder_isolation"], ["biceps"], ["triceps"]],
    # Leg curls first where there's a machine: hinges alone leave hamstrings short.
    "lower": [["squat"], ["hinge"], ["lunge"], ["knee_flexion", "glute"], ["calf"], ["core"], ["core"]],
    "push": [["push_horizontal"], ["push_vertical"], ["push_horizontal"], ["shoulder_isolation"], ["triceps"], ["core"]],
    "pull": [["pull_vertical", "pull_horizontal"], ["pull_horizontal", "pull_vertical"], ["rear_delt"], ["biceps"], ["biceps"], ["core"]],
    "legs": [["squat"], ["hinge"], ["lunge"], ["knee_flexion", "glute"], ["calf"], ["core"]],
}
SESSION_LABELS = {
    "full": "Full body", "upper": "Upper body", "lower": "Lower body",
    "push": "Push (chest, shoulders, triceps)", "pull": "Pull (back, biceps)", "legs": "Legs",
    "mobility": "Mobility", "rest": "Rest", "quick": "Quick session",
}
# Back extensions stand in for rows when there's nothing to pull against.
NO_PULL_FALLBACK = "Superman"
MOBILITY_ROUTINE = [
    "Cat_Stretch", "Childs_Pose", "Kneeling_Hip_Flexor", "Upper_Back_Stretch", "Shoulder_Stretch",
    "Standing_Hamstring_and_Calf_Stretch", "Side_Neck_Stretch", "Hug_Knees_To_Chest",
]
# Beginners get time for 3 sets of their main lifts (enough volume to build muscle).
SESSION_MINUTES = {"beginner": 50, "intermediate": 55, "expert": 60}
WORK_SECONDS_PER_SET = 45
SETUP_SECONDS_PER_EXERCISE = 60


def user_level(experience: Optional[str]) -> str:
    return catalog.EXPERIENCE_LEVEL.get((experience or "").lower(), "beginner")


def training_days(days_per_week: Optional[int], experience: Optional[str]) -> int:
    days = days_per_week or DEFAULT_DAYS.get((experience or "").lower(), 3)
    return min(max(days, 1), 6)


class _Picker:
    """Chooses exercises for slots, rotating through options across the week."""

    def __init__(self, pool: List[Exercise], level: str, variant: int, loaded: bool = False):
        self.pool = pool
        self.level = level
        self.variant = variant
        # When weights are available, loaded versions beat bodyweight ones.
        self.loaded = loaded
        self.used_this_week: Counter = Counter()

    def _tier(self, exercise: Exercise) -> tuple:
        """Lower is better: weights (when there are any), compound, closest level."""
        rank = catalog.LEVEL_RANK[self.level]
        return (
            self.loaded and not catalog.is_loaded(exercise),
            exercise.mechanic != "compound",
            abs(catalog.LEVEL_RANK.get(exercise.level, 0) - rank),
        )

    def options(self, pattern: str) -> List[Exercise]:
        candidates = [e for e in self.pool if e.coaching.pattern == pattern]
        # Weighted first (if weights are available: they can be loaded up week after
        # week), compound, closest level, then name.
        return sorted(candidates, key=lambda e: (*self._tier(e), e.id))

    def pick(self, patterns: Sequence[str], taken: set) -> Optional[Exercise]:
        """The best option, rotating only among equally good ones.

        A weaker exercise (a band pull-up at a gym that has a lat pulldown) is
        never picked for variety's sake; repeating the best one in the week is
        fine and makes progress easy to track.
        """
        for pattern in patterns:
            options = [e for e in self.options(pattern) if e.id not in taken]
            if options:
                best = self._tier(options[0])
                top = [e for e in options if self._tier(e) == best]
                turn = self.used_this_week[pattern] + self.variant
                self.used_this_week[pattern] += 1
                return top[turn % len(top)]
        return None


def _minutes(entries: List[dict]) -> float:
    total = 0
    for entry in entries:
        rest = entry["rest"]
        rest_seconds = int(rest[:-1]) if rest.endswith("s") else int(rest.split()[0]) * 60
        total += entry["sets"] * (WORK_SECONDS_PER_SET + rest_seconds) + SETUP_SECONDS_PER_EXERCISE
    return total / 60


def entry_for(exercise: Exercise, goal: str, level: str, main_lift: bool = True) -> dict:
    """A plan exercise: the catalogue summary plus its prescription."""
    summary = exercise.summary()
    return {
        "exercise_id": exercise.id,
        "name": exercise.name,
        **programming.prescribe(exercise, goal, level, main_lift),
        "difficulty": programming.DIFFICULTY.get(exercise.level, "medium"),
        "video_url": exercise.coaching.video_url,
        "pattern": exercise.coaching.pattern,
        "primary_muscles": exercise.primary_muscles,
        "secondary_muscles": exercise.secondary_muscles,
        "equipment": exercise.equipment,
        "image": summary["image"],
        "per_side": exercise.coaching.per_side,
        "main_lift": main_lift,
    }


def mobility_session(goal: str, level: str, joints: set, count: int = 6, offset: int = 0) -> List[dict]:
    """A desk-friendly stretching routine that avoids injured joints."""
    start = offset % len(MOBILITY_ROUTINE)
    ids = MOBILITY_ROUTINE[start:] + MOBILITY_ROUTINE[:start]
    safe = [catalog.get(i) for i in ids if not set(catalog.get(i).coaching.loads) & joints]
    return [entry_for(e, goal, level) for e in safe[:count]]


def build_week(
    *,
    goal: str,
    experience: Optional[str],
    equipment: Sequence[str],
    injuries: Sequence[str],
    days_per_week: Optional[int],
    variant: int = 0,
) -> dict:
    """The weekly plan: days with exercises, plus how it was built."""
    level = user_level(experience)
    owned = list(equipment) or ["bodyweight"]
    joints = catalog.injured_joints(injuries)
    pool = [e for e in catalog.curated() if e.coaching.pattern != "mobility" and catalog.allowed(e, owned, joints, level)]
    pool = without_stand_ins(pool, owned)
    picker = _Picker(pool, level, variant, loaded=has_weights(owned))
    days = training_days(days_per_week, experience)
    budget = SESSION_MINUTES[level]
    notes: List[str] = []
    # Back extensions stand in only when nothing to pull against is available at all,
    # not when the one pulling exercise is already used in the session.
    can_pull = any(e.coaching.pattern in PULL for e in pool)
    # A pull day needs at least two different rows or pull-ups; otherwise six days are
    # upper/lower/full twice.
    pulls = [e for e in pool if e.coaching.pattern in ("pull_horizontal", "pull_vertical")]
    schedule = dict(SPLITS[days] if len(pulls) >= MIN_PULLS_FOR_PULL_DAY or days != 6 else SIX_DAYS_WITHOUT_PULL)

    week = []
    mobility_day_used = False
    for index, day in enumerate(DAYS):
        session = schedule.get(index)
        if session is None:
            # One mobility day for desk-bound weeks; the rest are full rest days.
            if not mobility_day_used and index != 6 and index > 0 and schedule.get(index - 1):
                mobility_day_used = True
                week.append({"day": day, "workout_type": "flexibility", "focus": SESSION_LABELS["mobility"],
                             "exercises": mobility_session(goal, level, joints, offset=variant)})
            else:
                week.append({"day": day, "workout_type": "rest", "focus": SESSION_LABELS["rest"], "exercises": []})
            continue
        entries: List[dict] = []
        taken: set = set()
        for patterns in SESSIONS[session]:
            exercise = picker.pick(patterns, taken)
            if exercise is None and not can_pull and set(patterns) & set(PULL):
                fallback = catalog.get(NO_PULL_FALLBACK)
                if fallback and catalog.allowed(fallback, owned, joints, level) and fallback.id not in taken:
                    exercise = fallback
                    if "no_pull_equipment" not in notes:
                        notes.append("no_pull_equipment")
            if exercise is None:
                continue
            taken.add(exercise.id)
            compounds_so_far = sum(1 for e in entries if catalog.get(e["exercise_id"]).mechanic == "compound")
            main_lift = exercise.mechanic == "compound" and compounds_so_far < programming.MAIN_LIFTS_PER_SESSION
            entry = entry_for(exercise, goal, level, main_lift)
            if entries and _minutes(entries + [entry]) > budget:
                break
            entries.append(entry)
        week.append({"day": day, "workout_type": "strength", "focus": SESSION_LABELS[session], "exercises": entries})

    if joints:
        notes.append("injury_adjusted")
    if not has_weights(owned):
        notes.append("bodyweight_only")
    return {
        "week": week,
        "meta": {
            "basis": programming.GUIDELINE_BASIS,
            "level": level,
            "goal": goal,
            "days_per_week": days,
            "session_minutes": budget,
            "weekly_sets": weekly_sets(week),
            "notes": notes,
            "variant": variant,
            "protected_joints": sorted(joints),
        },
    }


# Exercises that stand in for a better one when equipment is missing: a floor
# press is for people without a bench, not a second chest press at the gym.
STAND_INS = {"Dumbbell_Floor_Press": {"bench", "full_gym"}}


def without_stand_ins(pool: List[Exercise], owned: Sequence[str]) -> List[Exercise]:
    return [e for e in pool if not (STAND_INS.get(e.id, set()) & set(owned))]


WEIGHTS = {"full_gym", "dumbbells", "barbell", "kettlebell"}



def has_weights(owned: Sequence[str]) -> bool:
    return bool(WEIGHTS & set(owned))


def weekly_sets(week: List[dict]) -> Dict[str, int]:
    """Hard sets per muscle across the week (mobility excluded).

    A set counts fully for the muscles an exercise mainly works and half for
    the ones it also works (a squat trains glutes too), the usual way to tally volume.
    """
    totals: Counter = Counter()
    for day in week:
        for entry in day["exercises"]:
            if entry.get("pattern") == "mobility":
                continue
            for muscle in entry["primary_muscles"]:
                totals[muscle] += entry["sets"]
            for muscle in entry.get("secondary_muscles") or []:
                if muscle not in entry["primary_muscles"]:
                    totals[muscle] += entry["sets"] / 2
    return {m: round(v, 1) for m, v in sorted(totals.items(), key=lambda kv: -kv[1])}


# --- Quick sessions and swaps --------------------------------------------------------
QUICK_MINUTES = (10, 15, 20)
QUICK_WORK_SECONDS = 40
QUICK_REST_SECONDS = 20
WARM_UP_SECONDS = 60
MIN_ROUNDS = 2


def _station_seconds(exercise: Exercise) -> int:
    """One exercise in a circuit: work (both sides if needed) plus rest."""
    work = QUICK_WORK_SECONDS * (2 if exercise.coaching.per_side else 1)
    return work + QUICK_REST_SECONDS


def _fit_circuit(picks: List[Exercise], seconds: int) -> tuple:
    """As many exercises as fit at least two rounds in the time, and the rounds that fit."""
    for count in range(len(picks), 1, -1):
        round_seconds = sum(_station_seconds(e) for e in picks[:count])
        rounds = seconds // round_seconds
        if rounds >= MIN_ROUNDS:
            return picks[:count], rounds
    return picks[:2], 1


QUICK_PATTERNS = [["squat", "lunge"], ["push_horizontal"], ["glute", "hinge"], PULL + ["core"], ["core"], ["cardio"]]


def quick_session(
    *, minutes: int, place: str, goal: str, experience: Optional[str], equipment: Sequence[str],
    injuries: Sequence[str], variant: int = 0,
) -> dict:
    """A short circuit: 40 s work, 20 s rest, rounds sized to the time available.

    ``place`` is "home" (bodyweight plus any home equipment) or "gym".
    """
    level = user_level(experience)
    owned = ["full_gym"] if place == "gym" else [e for e in equipment if e != "full_gym"] or ["bodyweight"]
    joints = catalog.injured_joints(injuries)
    pool = [e for e in catalog.curated() if e.coaching.pattern != "mobility" and catalog.allowed(e, owned, joints, level)]
    picker = _Picker(pool, level, variant, loaded=has_weights(owned))
    taken: set = set()
    picks = []
    for patterns in QUICK_PATTERNS:
        exercise = picker.pick(patterns, taken)
        if exercise:
            taken.add(exercise.id)
            picks.append(exercise)
    warm_up = catalog.get("Arm_Circles")
    picks, rounds = _fit_circuit(picks, minutes * 60 - WARM_UP_SECONDS)
    exercises = [{**entry_for(warm_up, goal, level), "sets": 1, "reps": "60s", "rest": "0s", "effort": "Easy warm-up"}]
    for exercise in picks:
        entry = entry_for(exercise, goal, level)
        side = " each side" if exercise.coaching.per_side else ""
        exercises.append({**entry, "sets": rounds, "reps": f"{QUICK_WORK_SECONDS}s{side}",
                          "rest": f"{QUICK_REST_SECONDS}s", "effort": "Good form at a steady pace"})
    return {
        "workout_type": "strength",
        "focus": SESSION_LABELS["quick"],
        "minutes": minutes,
        "place": place,
        "rounds": rounds,
        "exercises": exercises,
    }


SWAP_LIMIT = 6


def swap_options(entry: dict, *, equipment: Sequence[str], injuries: Sequence[str], experience: Optional[str],
                 exclude: set) -> List[Exercise]:
    """Allowed exercises with the same movement pattern (a squat for a squat)."""
    level = user_level(experience)
    owned = list(equipment) or ["bodyweight"]
    joints = catalog.injured_joints(injuries)
    picker = _Picker(
        [e for e in catalog.curated() if catalog.allowed(e, owned, joints, level)], level, 0,
    )
    return [e for e in picker.options(entry.get("pattern") or "") if e.id not in exclude][:SWAP_LIMIT]
