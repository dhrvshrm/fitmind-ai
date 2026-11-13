"""Progressive overload, decided by rules rather than AI.

Double progression, as recommended in the ACSM resistance training position
stand (2026): keep the weight while reps climb through the exercise's rep
range; once every set reaches the top of the range, add a small amount of
weight (ACSM suggests 2 to 10 percent) and build the reps back up. Bodyweight
exercises can't take more weight, so they move to the harder variation in the
catalogue instead.

Also here:
- estimated one-rep max (Epley) to compare sessions with different weights and reps;
- personal records;
- stall detection, which leads to a suggested easy (deload) week;
- level checks (beginner to intermediate to advanced) from consistency and
  strength relative to body weight.

Everything works from logged sets only; nothing changes without the user
seeing it and, for level and deload changes, accepting it.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Dict, List, Optional, Sequence, Tuple

# Weight steps, in kg. Legs and hips can take bigger jumps than upper-body
# lifts; small single-joint moves use the smallest dumbbell steps.
LOWER_BODY_PATTERNS = {"squat", "hinge", "lunge", "glute"}
ISOLATION_PATTERNS = {
    "calf", "knee_flexion", "knee_extension", "shoulder_isolation", "rear_delt", "biceps", "triceps",
}
INCREMENT_LOWER_KG = 5.0
INCREMENT_UPPER_KG = 2.5
INCREMENT_ISOLATION_KG = 1.0
# How much to take off after repeated misses: about 10 percent, at least one step.
REDUCE_FRACTION = 0.10
# A jump is never more than 10 percent of the current weight (ACSM's 2 to 10
# percent), never under 1 kg, and rounded to the nearest 0.5 kg.
MAX_JUMP_FRACTION = 0.10
MIN_JUMP_KG = 1.0
ROUND_TO_KG = 0.5

# Sessions in a row at the top of the range before adding weight. One is
# enough when the user said it felt easy.
TOP_SESSIONS_NEEDED = 2
# Sessions in a row below the range at the same weight before easing off.
MISS_SESSIONS_FOR_REDUCE = 2

# A lift has stalled when its best estimated max hasn't improved for this
# long, across at least this many sessions.
STALL_DAYS = 21
STALL_MIN_SESSIONS = 4
# Two or more stalled main lifts suggest an easy week.
STALLED_LIFTS_FOR_DELOAD = 2
DELOAD_DAYS = 7
DELOAD_SET_FACTOR = 0.6
DELOAD_EFFORT = "Easy week: stop 4 or more reps short of failure"

# Level checks. Consistency is measured against the user's own plan, so
# someone training 3 days a week isn't held to a 6-day lifter's count:
# at least 75 percent of planned sessions in the window, and a floor so a
# very light schedule still means real training time.
LEVEL_RULES = {
    # beginner -> intermediate: about 8 weeks of steady training.
    "intermediate": {"window_days": 56, "adherence": 0.75, "min_workouts": 16},
    # intermediate -> advanced: about 6 months of steady training.
    "advanced": {"window_days": 182, "adherence": 0.75, "min_workouts": 48},
}
DEFAULT_DAYS_PER_WEEK = 3

# Strength relative to body weight (estimated one-rep max / body weight) by
# movement pattern. Rough, widely used strength-standard heuristics for adult
# lifters, not an official standard; used only to suggest a level change.
STRENGTH_STANDARDS: Dict[str, Dict[str, float]] = {
    "intermediate": {"squat": 1.0, "hinge": 1.25, "push_horizontal": 0.75, "pull_horizontal": 0.75, "push_vertical": 0.5},
    "advanced": {"squat": 1.5, "hinge": 2.0, "push_horizontal": 1.2, "pull_horizontal": 1.1, "push_vertical": 0.75},
}
# Lifts that must meet the standard to count.
STANDARDS_NEEDED = 2
# Bodyweight-only lifters: share of their exercises at the top of the range.
BODYWEIGHT_TOP_SHARE = 0.6

NEXT_LEVEL = {"beginner": "intermediate", "intermediate": "advanced"}

Set = Dict[str, float]  # {"weight_kg": float, "reps": int}


@dataclass(frozen=True)
class Session:
    """One exercise on one day."""

    date: str
    sets: Tuple[Tuple[float, int], ...]  # (weight_kg, reps)
    felt: Optional[str] = None  # easy | right | hard

    @property
    def top_weight(self) -> float:
        return max((w for w, _ in self.sets), default=0.0)


def session_from_doc(doc: dict) -> Session:
    sets = tuple(
        (float(s.get("weight_kg") or 0), int(s.get("reps") or 0))
        for s in doc.get("sets", [])
        if int(s.get("reps") or 0) > 0
    )
    return Session(date=doc["date"], sets=sets, felt=doc.get("felt"))


def increment_for(pattern: Optional[str]) -> float:
    if pattern in ISOLATION_PATTERNS:
        return INCREMENT_ISOLATION_KG
    if pattern in LOWER_BODY_PATTERNS:
        return INCREMENT_LOWER_KG
    return INCREMENT_UPPER_KG


def round_to_step(weight: float, step: float = ROUND_TO_KG) -> float:
    return round(round(weight / step) * step, 2)


def next_weight(weight: float, pattern: Optional[str]) -> float:
    """The next weight up: the pattern's usual step, capped at 10 percent of the current weight."""
    jump = min(increment_for(pattern), max(MIN_JUMP_KG, weight * MAX_JUMP_FRACTION))
    return round_to_step(weight + jump)


def estimated_max(weight: float, reps: int) -> float:
    """Epley estimate of a one-rep max. Bodyweight sets (weight 0) give 0."""
    if weight <= 0 or reps <= 0:
        return 0.0
    if reps == 1:
        return float(weight)
    return round(weight * (1 + reps / 30), 1)


def best_estimated_max(session: Session) -> float:
    return max((estimated_max(w, r) for w, r in session.sets), default=0.0)


def parse_rep_range(reps: str) -> Optional[Tuple[int, int]]:
    """'8-12' or '8-12 each side' -> (8, 12); '10' -> (10, 10); holds ('30s') -> None."""
    text = (reps or "").split(" ")[0]
    if not text or text.endswith("s"):
        return None
    try:
        if "-" in text:
            low, high = text.split("-", 1)
            return int(low), int(high)
        value = int(text)
        return value, value
    except ValueError:
        return None


def _all_at_top(session: Session, high: int, sets_planned: int) -> bool:
    done = [r for _, r in session.sets]
    return len(done) >= sets_planned and all(r >= high for r in done[:sets_planned])


def _any_below(session: Session, low: int) -> bool:
    return any(r < low for _, r in session.sets)


def next_target(
    history: Sequence[Session],
    rep_range: Tuple[int, int],
    sets_planned: int,
    *,
    loaded: bool,
    pattern: Optional[str] = None,
    harder_id: Optional[str] = None,
) -> dict:
    """What to aim for today, from this exercise's past sessions (newest first).

    Returns ``action`` (first_time, add_weight, add_reps, hold, reduce,
    harder_variation, add_set), the suggested ``weight_kg`` (None without
    load), the ``reps`` to aim for, and ``last`` (the previous session's sets).
    """
    low, high = rep_range
    history = [s for s in history if s.sets]
    if not history:
        return {"action": "first_time", "weight_kg": None, "reps": [low, high], "last": None}

    last = history[0]
    last_sets = [{"weight_kg": w, "reps": r} for w, r in last.sets]
    base = {"last": {"date": last.date, "sets": last_sets}}

    if not loaded:
        recent_top = [s for s in history[:TOP_SESSIONS_NEEDED] if _all_at_top(s, high, sets_planned)]
        ready = len(recent_top) >= TOP_SESSIONS_NEEDED or (recent_top and last.felt == "easy" and recent_top[0] is last)
        if ready:
            if harder_id:
                return {**base, "action": "harder_variation", "weight_kg": None, "reps": [low, high], "harder_id": harder_id}
            return {**base, "action": "add_set", "weight_kg": None, "reps": [low, high]}
        return {**base, "action": "add_reps", "weight_kg": None, "reps": [min(high, _best_reps(last) + 1), high]}

    weight = last.top_weight
    same_weight = [s for s in history if s.top_weight == weight]
    streak_top = 0
    for s in same_weight:
        if _all_at_top(s, high, sets_planned):
            streak_top += 1
        else:
            break
    if streak_top >= TOP_SESSIONS_NEEDED or (streak_top >= 1 and last.felt == "easy"):
        return {**base, "action": "add_weight", "weight_kg": next_weight(weight, pattern), "reps": [low, high]}

    misses = 0
    for s in same_weight:
        if _any_below(s, low):
            misses += 1
        else:
            break
    if misses >= MISS_SESSIONS_FOR_REDUCE:
        lighter = max(MIN_JUMP_KG, round_to_step(weight * (1 - REDUCE_FRACTION)))
        return {**base, "action": "reduce", "weight_kg": min(lighter, weight), "reps": [low, high]}

    if _any_below(last, low) or last.felt == "hard":
        return {**base, "action": "hold", "weight_kg": weight, "reps": [low, high]}
    return {**base, "action": "add_reps", "weight_kg": weight, "reps": [min(high, _best_reps(last) + 1), high]}


def _best_reps(session: Session) -> int:
    return min((r for _, r in session.sets), default=0)


def new_records(today: Session, history: Sequence[Session]) -> List[dict]:
    """Personal records set today: heaviest weight or best estimated max."""
    previous = [s for s in history if s.date < today.date and s.sets]
    if not previous or not today.sets:
        return []
    records = []
    best_weight = max(s.top_weight for s in previous)
    if today.top_weight > 0 and today.top_weight > best_weight:
        records.append({"kind": "weight", "value": today.top_weight, "previous": best_weight})
    best_e1rm = max(best_estimated_max(s) for s in previous)
    today_e1rm = best_estimated_max(today)
    if today_e1rm > 0 and today_e1rm > best_e1rm and not records:
        records.append({"kind": "estimated_max", "value": today_e1rm, "previous": best_e1rm})
    if today.top_weight == 0:
        best_reps = max((r for s in previous for _, r in s.sets), default=0)
        today_reps = max((r for _, r in today.sets), default=0)
        if today_reps > best_reps:
            records.append({"kind": "reps", "value": today_reps, "previous": best_reps})
    return records


def is_stalled(history: Sequence[Session], today: date) -> bool:
    """No better estimated max in the last STALL_DAYS, over enough sessions."""
    window_start = (today - timedelta(days=STALL_DAYS)).isoformat()
    loaded = [s for s in history if s.top_weight > 0]
    recent = [s for s in loaded if s.date >= window_start]
    older = [s for s in loaded if s.date < window_start]
    if len(recent) < STALL_MIN_SESSIONS or not older:
        return False
    return max(best_estimated_max(s) for s in recent) <= max(best_estimated_max(s) for s in older)


def deload_entry(entry: dict) -> dict:
    """Today's version of a planned exercise during an easy week."""
    if entry.get("pattern") == "mobility":
        return entry
    sets = max(1, round(int(entry.get("sets", 1)) * DELOAD_SET_FACTOR))
    return {**entry, "sets": sets, "effort": DELOAD_EFFORT}


def workouts_needed(target_level: str, days_per_week: Optional[int]) -> int:
    """Sessions needed in the window: 75 percent of the user's own plan, with a floor."""
    rules = LEVEL_RULES[target_level]
    weeks = rules["window_days"] / 7
    planned = (days_per_week or DEFAULT_DAYS_PER_WEEK) * weeks
    return max(rules["min_workouts"], math.ceil(planned * rules["adherence"]))


def level_check(
    level: str,
    workout_dates: Sequence[str],
    best_max_by_pattern: Dict[str, float],
    body_weight_kg: Optional[float],
    bodyweight_top_share: Optional[float],
    today: date,
    days_per_week: Optional[int] = None,
) -> dict:
    """Whether the user looks ready for the next level, and what's still missing.

    ``best_max_by_pattern`` holds the best recent estimated max per movement
    pattern; ``bodyweight_top_share`` is the share of bodyweight exercises at
    the top of their range (used when there are no weighted lifts).
    """
    target = NEXT_LEVEL.get(level)
    if target is None:
        return {"level": level, "next_level": None, "ready": False}
    rules = LEVEL_RULES[target]
    start = (today - timedelta(days=rules["window_days"])).isoformat()
    workouts = len({d for d in workout_dates if d >= start})
    needed = workouts_needed(target, days_per_week)
    consistent = workouts >= needed

    standards = STRENGTH_STANDARDS[target]
    lifts = []
    for pattern, ratio in standards.items():
        best = best_max_by_pattern.get(pattern)
        if best and body_weight_kg:
            lifts.append({
                "pattern": pattern,
                "ratio": round(best / body_weight_kg, 2),
                "needed": ratio,
                "met": best / body_weight_kg >= ratio,
            })
    met = sum(1 for lift in lifts if lift["met"])
    if lifts:
        strong = met >= STANDARDS_NEEDED
    else:
        strong = (bodyweight_top_share or 0) >= BODYWEIGHT_TOP_SHARE
    return {
        "level": level,
        "next_level": target,
        "ready": consistent and strong,
        "workouts": workouts,
        "workouts_needed": needed,
        "days_per_week": days_per_week or DEFAULT_DAYS_PER_WEEK,
        "window_days": rules["window_days"],
        "lifts": lifts,
        "lifts_needed": STANDARDS_NEEDED,
        "uses_bodyweight": not lifts,
    }


# Why lifts may have stalled. Muscle and strength are built from training,
# protein and sleep; when lifts stop moving, the gap is often outside the gym.
# Checked over the same window as the stall.
REASON_WINDOW_DAYS = STALL_DAYS
PROTEIN_SHORT_SHARE = 0.8  # average logged protein under 80% of target
MIN_LOGGED_DAYS_FOR_PROTEIN = 5
SLEEP_SHORT_HOURS = 7.0  # adults need 7 or more hours (AASM / Sleep Research Society)
RECOVERY_LOW_SCORE = 60
MIN_RECOVERY_LOGS = 3


def stall_reasons(
    protein_by_day: Sequence[float],
    protein_target: Optional[float],
    sleep_hours: Sequence[float],
    recovery_scores: Sequence[int],
) -> List[dict]:
    """Likely reasons outside training, each only with enough logged data behind it."""
    reasons = []
    if protein_target and len(protein_by_day) >= MIN_LOGGED_DAYS_FOR_PROTEIN:
        share = sum(protein_by_day) / len(protein_by_day) / protein_target
        if share < PROTEIN_SHORT_SHARE:
            reasons.append({"kind": "protein", "percent": round(share * 100), "days": len(protein_by_day)})
    if len(sleep_hours) >= MIN_RECOVERY_LOGS:
        average = sum(sleep_hours) / len(sleep_hours)
        if average < SLEEP_SHORT_HOURS:
            reasons.append({"kind": "sleep", "hours": round(average, 1)})
    if len(recovery_scores) >= MIN_RECOVERY_LOGS:
        average = sum(recovery_scores) / len(recovery_scores)
        if average < RECOVERY_LOW_SCORE:
            reasons.append({"kind": "recovery", "score": round(average)})
    return reasons
