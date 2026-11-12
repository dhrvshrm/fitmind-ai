"""Friend challenge types and how progress is counted from logs.

Each challenge runs for a fixed number of days from the day it's accepted.
Progress is counted only from what was logged inside that window, so it
can't be finished early or re-used. Each kind counts "good days" (or
workouts) towards a goal.
"""
from typing import Dict, Sequence

CHALLENGE_KINDS: Dict[str, dict] = {
    "protein_week": {"duration_days": 7, "goal": 7, "unit": "days"},
    "workouts_week": {"duration_days": 7, "goal": 3, "unit": "workouts"},
    "log_meals_5": {"duration_days": 7, "goal": 5, "unit": "days"},
    "water_week": {"duration_days": 7, "goal": 5, "unit": "days"},
}
# A protein day counts at 90% of the target, so a slightly short day still counts.
PROTEIN_HIT_RATIO = 0.9
# "Logged every meal" means at least this many meals that day.
MEALS_PER_FULL_DAY = 3


def day_counts(kind: str, day: dict, targets: dict) -> int:
    """How much one day of logs adds to a challenge of ``kind``."""
    if kind == "protein_week":
        target = targets.get("protein") or 0
        return int(bool(target) and day["protein"] >= PROTEIN_HIT_RATIO * target)
    if kind == "workouts_week":
        return int(day["workouts"] > 0)
    if kind == "log_meals_5":
        return int(day["meal_count"] >= MEALS_PER_FULL_DAY)
    if kind == "water_week":
        target = targets.get("water_ml") or 0
        return int(bool(target) and day["water_ml"] >= target)
    return 0


def progress(kind: str, days: Sequence[dict], targets: dict) -> dict:
    """Progress for one participant over the challenge window's day records."""
    goal = CHALLENGE_KINDS[kind]["goal"]
    count = sum(day_counts(kind, d, targets) for d in days)
    return {"count": min(count, goal), "goal": goal, "completed": count >= goal}
