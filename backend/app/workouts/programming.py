"""Sets, reps, rest and effort, decided by rules rather than AI.

Based on the ACSM resistance training position stand (2026) and the WHO
2020 physical activity guidelines:
- Train every major muscle group at least twice a week.
- Strength: heavy loads, low reps, 2 to 3 sets, longer rest.
- Muscle growth: about 10 hard sets per muscle per week, moderate reps.
- Training to failure isn't needed; stopping 1 to 3 reps short works as well.
- Beginners start with fewer sets; any training beats none.

The app says "follows ACSM and WHO guidelines". Neither body approves
specific exercises or apps.
"""
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from app.workouts.catalog import Exercise

GUIDELINE_BASIS = "ACSM resistance training position stand (2026) and WHO physical activity guidelines (2020)"


@dataclass(frozen=True)
class Scheme:
    sets: int
    reps: Tuple[int, int]
    rest_seconds: int
    reps_in_reserve: int


SCHEMES: Dict[str, Scheme] = {
    "strength": Scheme(sets=3, reps=(4, 6), rest_seconds=180, reps_in_reserve=2),
    "hypertrophy": Scheme(sets=3, reps=(8, 12), rest_seconds=90, reps_in_reserve=2),
    "general": Scheme(sets=3, reps=(10, 15), rest_seconds=60, reps_in_reserve=3),
}
GOAL_SCHEME = {
    "athletic_performance": "strength",
    "muscle_gain": "hypertrophy",
    "recomposition": "hypertrophy",
    "fat_loss": "general",
    "maintain": "general",
    "general_fitness": "general",
}
# Small single-joint exercises stay in moderate-to-high reps whatever the goal.
ISOLATION_SCHEME = Scheme(sets=3, reps=(10, 15), rest_seconds=60, reps_in_reserve=2)
CORE_REPS = Scheme(sets=3, reps=(10, 15), rest_seconds=45, reps_in_reserve=3)
HOLD_SECONDS = {"beginner": 20, "intermediate": 40, "expert": 60}
INTERVAL_SECONDS = 30
MOBILITY_HOLD_SECONDS = 30
# Beginners: 3 sets of the big compound lifts (enough weekly volume to build muscle),
# 2 of the small isolation and core work.
BEGINNER_SETS = 2
BEGINNER_COMPOUND_SETS = 3
EXPERT_COMPOUND_SETS = 4

# The exercise's skill level (how hard it is to learn), shown on plan cards.
DIFFICULTY = {"beginner": "beginner", "intermediate": "intermediate", "expert": "advanced"}

# Recovery score bands (0-100) and what they change today.
RECOVERY_REST_BELOW = 40
RECOVERY_LIGHT_BELOW = 60


def _rest(seconds: int) -> str:
    return f"{seconds}s" if seconds < 120 else f"{seconds // 60} min"


def _effort(reps_in_reserve: int) -> str:
    return f"Stop {reps_in_reserve} reps short of failure"


# Without added weight, more reps are needed to reach a hard set.
BODYWEIGHT_REPS = (12, 20)
# Heavy strength work goes on the first lifts of a session; the rest build muscle.
MAIN_LIFTS_PER_SESSION = 2


def scheme_for(exercise: Exercise, goal: str, main_lift: bool = True) -> Scheme:
    coaching = exercise.coaching
    if coaching is None:
        raise ValueError(f"{exercise.id} isn't curated; plans only use curated exercises")
    pattern = coaching.pattern
    if pattern == "core":
        return CORE_REPS
    if exercise.mechanic == "isolation" or pattern in (
        "calf", "knee_flexion", "knee_extension", "shoulder_isolation", "rear_delt", "biceps", "triceps",
    ):
        return ISOLATION_SCHEME
    name = GOAL_SCHEME.get(goal, "general")
    if name == "strength" and not main_lift:
        name = "hypertrophy"
    scheme = SCHEMES[name]
    if not coaching.needs:
        return Scheme(scheme.sets, BODYWEIGHT_REPS, min(scheme.rest_seconds, 90), scheme.reps_in_reserve)
    return scheme


def prescribe(exercise: Exercise, goal: str, level: str, main_lift: bool = True) -> dict:
    """Sets, reps, rest and effort for one curated exercise.

    ``main_lift`` marks one of the first compound lifts of a session, the
    only place heavy strength sets are used.
    """
    coaching = exercise.coaching
    if coaching is None:
        raise ValueError(f"{exercise.id} isn't curated; plans only use curated exercises")
    side = " each side" if coaching.per_side else ""
    if coaching.pattern == "mobility":
        return {"sets": 2, "reps": f"{MOBILITY_HOLD_SECONDS}s{side}", "rest": "0s", "effort": "Gentle stretch, no pain"}
    if coaching.unit == "seconds" and coaching.pattern == "cardio":
        return {"sets": 3, "reps": f"{INTERVAL_SECONDS}s", "rest": f"{INTERVAL_SECONDS}s", "effort": "Steady, hard but controlled"}
    if coaching.unit == "seconds":
        return {"sets": 3, "reps": f"{HOLD_SECONDS.get(level, 20)}s{side}", "rest": "45s", "effort": "Hold good form; stop if it breaks"}
    scheme = scheme_for(exercise, goal, main_lift)
    sets = scheme.sets
    if level == "beginner":
        compound = exercise.mechanic == "compound" and coaching.pattern != "core"
        sets = min(sets, BEGINNER_COMPOUND_SETS if compound else BEGINNER_SETS)
    elif level == "expert" and exercise.mechanic == "compound" and main_lift:
        sets = EXPERT_COMPOUND_SETS
    low, high = coaching.rep_range or scheme.reps
    return {
        "sets": sets,
        "reps": f"{low}-{high}{side}",
        "rest": _rest(scheme.rest_seconds),
        "effort": _effort(scheme.reps_in_reserve),
    }


def adjust_for_recovery(entry: dict, recovery_score: Optional[int]) -> dict:
    """Today's version of a planned exercise: one set fewer and easier effort on low recovery."""
    if recovery_score is None or recovery_score >= RECOVERY_LIGHT_BELOW:
        return entry
    if entry.get("pattern") == "mobility":
        return entry
    return {**entry, "sets": max(1, entry["sets"] - 1), "effort": "Lighter today: stop 3 or more reps short of failure"}


def recovery_mode(recovery_score: Optional[int]) -> str:
    """normal, light (fewer sets) or rest (mobility instead of training)."""
    if recovery_score is None or recovery_score >= RECOVERY_LIGHT_BELOW:
        return "normal"
    return "rest" if recovery_score < RECOVERY_REST_BELOW else "light"
