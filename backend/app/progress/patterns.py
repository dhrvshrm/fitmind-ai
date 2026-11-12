"""Rule-based habit patterns from the last four weeks of logs.

Each rule looks for one specific habit and only reports it when there is
enough evidence (a minimum number of days and a clear share of them). The
result is a code plus the numbers behind it; the app turns that into words,
so nothing here is a guess or a diagnosis.
"""
from datetime import date
from typing import Dict, List, Optional, Sequence, Set

WINDOW_DAYS = 28
# A day counts as "logged" for nutrition rules once it has this many meals.
MIN_MEALS_FOR_LOGGED_DAY = 2

WEEKEND = {5, 6}  # Saturday, Sunday (date.weekday()).
WEEKEND_PROTEIN_RATIO = 0.8
WEEKEND_PROTEIN_MIN_GAP_G = 15
MIN_WEEKEND_DAYS = 2
MIN_WEEKDAY_DAYS = 4

LATE_HOUR = 22
LATE_MIN_DAYS = 4
LATE_MIN_SHARE = 0.3

BREAKFAST_BEFORE_HOUR = 11
BREAKFAST_MIN_DAYS = 7
BREAKFAST_MIN_SHARE = 0.5

PROTEIN_MISS_RATIO = 0.8
PROTEIN_MISS_MIN_DAYS = 7
PROTEIN_MISS_MIN_SHARE = 0.5

OVERSHOOT_RATIO = 1.15
OVERSHOOT_MIN_DAYS = 7
OVERSHOOT_MIN_SHARE = 0.3

WATER_LOW_RATIO = 0.6
WATER_MIN_DAYS = 5
WATER_MIN_SHARE = 0.6

# A planned weekday must have come round at least this often to judge it.
WORKOUT_MIN_OCCURRENCES = 3
WORKOUT_MIN_ACTIVE_DAYS = 4


def _hour(time: Optional[str]) -> Optional[int]:
    if not time or ":" not in time:
        return None
    try:
        return int(time.split(":")[0])
    except ValueError:
        return None


def _weekday(iso: str) -> int:
    return date.fromisoformat(iso).weekday()


def _pattern(code: str, severity: str, days: int, of: int, **values: object) -> dict:
    return {"code": code, "severity": severity, "evidence_days": days, "evidence_of": of, "values": values}


def protein_lower_on_weekends(days: Sequence[dict]) -> Optional[dict]:
    logged = [d for d in days if d["meal_count"] >= MIN_MEALS_FOR_LOGGED_DAY]
    weekend = [d["protein"] for d in logged if _weekday(d["date"]) in WEEKEND]
    weekday = [d["protein"] for d in logged if _weekday(d["date"]) not in WEEKEND]
    if len(weekend) < MIN_WEEKEND_DAYS or len(weekday) < MIN_WEEKDAY_DAYS:
        return None
    weekend_avg = sum(weekend) / len(weekend)
    weekday_avg = sum(weekday) / len(weekday)
    if weekend_avg < WEEKEND_PROTEIN_RATIO * weekday_avg and weekday_avg - weekend_avg >= WEEKEND_PROTEIN_MIN_GAP_G:
        return _pattern("protein_low_weekends", "info", len(weekend), len(logged),
                        weekend_avg=round(weekend_avg), weekday_avg=round(weekday_avg))
    return None


def late_night_eating(days: Sequence[dict]) -> Optional[dict]:
    timed = [d for d in days if d["meal_times"]]
    late = [d for d in timed if any((_hour(t) or 0) >= LATE_HOUR for t in d["meal_times"])]
    if len(late) >= LATE_MIN_DAYS and len(late) >= LATE_MIN_SHARE * len(timed):
        return _pattern("late_night_eating", "info", len(late), len(timed), hour=LATE_HOUR)
    return None


def skipped_breakfast(days: Sequence[dict]) -> Optional[dict]:
    logged = [d for d in days if d["meal_count"] >= MIN_MEALS_FOR_LOGGED_DAY]
    if len(logged) < BREAKFAST_MIN_DAYS:
        return None
    skipped = [
        d for d in logged
        if "breakfast" not in d["meal_types"]
        and not any((_hour(t) if _hour(t) is not None else 99) < BREAKFAST_BEFORE_HOUR for t in d["meal_times"])
    ]
    if len(skipped) >= BREAKFAST_MIN_SHARE * len(logged):
        return _pattern("skipped_breakfast", "info", len(skipped), len(logged))
    return None


def protein_misses(days: Sequence[dict], protein_target: float) -> Optional[dict]:
    logged = [d for d in days if d["meal_count"] >= MIN_MEALS_FOR_LOGGED_DAY]
    if not protein_target or len(logged) < PROTEIN_MISS_MIN_DAYS:
        return None
    missed = [d for d in logged if d["protein"] < PROTEIN_MISS_RATIO * protein_target]
    if len(missed) >= PROTEIN_MISS_MIN_SHARE * len(logged):
        avg = sum(d["protein"] for d in logged) / len(logged)
        return _pattern("protein_misses", "warning", len(missed), len(logged),
                        average=round(avg), target=round(protein_target))
    return None


def calorie_overshoot(days: Sequence[dict], calorie_target: float) -> Optional[dict]:
    # Flexible days are allowed to go over on purpose, so they don't count.
    logged = [d for d in days if d["meal_count"] >= MIN_MEALS_FOR_LOGGED_DAY and not d.get("flexible")]
    if not calorie_target or len(logged) < OVERSHOOT_MIN_DAYS:
        return None
    over = [d for d in logged if d["calories"] > OVERSHOOT_RATIO * calorie_target]
    if len(over) >= OVERSHOOT_MIN_SHARE * len(logged):
        weekend_share = sum(1 for d in over if _weekday(d["date"]) in WEEKEND) / len(over)
        return _pattern("calorie_overshoot", "warning", len(over), len(logged),
                        target=round(calorie_target), mostly_weekends=weekend_share >= 0.6)
    return None


def low_water(days: Sequence[dict], water_target: float) -> Optional[dict]:
    logged = [d for d in days if d["water_ml"] > 0]
    if not water_target or len(logged) < WATER_MIN_DAYS:
        return None
    low = [d for d in logged if d["water_ml"] < WATER_LOW_RATIO * water_target]
    if len(low) >= WATER_MIN_SHARE * len(logged):
        avg = sum(d["water_ml"] for d in logged) / len(logged)
        return _pattern("low_water", "info", len(low), len(logged),
                        average_ml=round(avg / 50) * 50, target_ml=round(water_target))
    return None


def missed_workout_weekdays(days: Sequence[dict], planned_weekdays: Set[int]) -> Optional[dict]:
    """Planned training weekdays that keep getting skipped while other days don't."""
    if not planned_weekdays:
        return None
    active = sum(1 for d in days if d["workouts"] > 0)
    if active < WORKOUT_MIN_ACTIVE_DAYS:
        return None
    missed: List[int] = []
    for weekday in sorted(planned_weekdays):
        occurrences = [d for d in days if _weekday(d["date"]) == weekday]
        if len(occurrences) < WORKOUT_MIN_OCCURRENCES:
            continue
        if all(d["workouts"] == 0 for d in occurrences):
            missed.append(weekday)
    if missed:
        return _pattern("missed_workout_weekdays", "info", len(missed), len(planned_weekdays), weekdays=missed)
    return None


def detect(days: Sequence[dict], targets: Dict[str, float], planned_weekdays: Set[int]) -> List[dict]:
    """Every pattern with enough evidence, most important first.

    ``days`` holds one record per date in the window with keys: date,
    meal_count, meal_types, meal_times, calories, protein, water_ml, workouts,
    flexible.
    """
    found = [
        protein_misses(days, targets.get("protein") or 0),
        calorie_overshoot(days, targets.get("calories") or 0),
        protein_lower_on_weekends(days),
        missed_workout_weekdays(days, planned_weekdays),
        skipped_breakfast(days),
        late_night_eating(days),
        low_water(days, targets.get("water_ml") or 0),
    ]
    return [p for p in found if p is not None]
