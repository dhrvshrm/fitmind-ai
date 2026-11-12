"""A day built around the person's routine: wake-up, workout, meals, wind-down, sleep.

Rules only. Times come from the answers already given (wake and sleep time,
work schedule, when they train, how many days a week), and meals are placed
around the workout: a light pre-workout snack and a protein-rich meal after.

Night and rotating shift workers (or anyone who wakes outside usual morning
hours) get a day measured from their own wake time instead of clock defaults.
During Ramadan the day runs from sehri before dawn to the late meal after iftar.
"""
from typing import Dict, List, Optional, Tuple

from app.nutrition.fasting import DEFAULT_DAWN, DEFAULT_SUNSET

DEFAULT_WAKE = "07:00"
DEFAULT_SLEEP = "23:00"
DAY_MINUTES = 24 * 60
# Usual start time for each answer to "When do you usually work out?".
WORKOUT_START: Dict[str, str] = {
    "early_morning": "06:00",
    "morning": "07:30",
    "afternoon": "16:00",
    "evening": "18:30",
    "night": "20:30",
}
MORNING_WORKOUTS = {"early_morning", "morning"}
WORKOUT_MINUTES = 45
WAKE_WATER_ML = 400
# Earliest a workout starts after waking, and how far before it the snack comes.
MIN_MINUTES_AFTER_WAKE = 30
PRE_WORKOUT_LEAD = 30
EVENING_SNACK_LEAD = 60
POST_WORKOUT_GAP = 30
WIND_DOWN_LEAD = 60

# Work patterns whose day doesn't follow the clock.
SHIFT_SCHEDULES = {"night_shift", "rotating_shifts"}
# Wake times in this range count as a usual day schedule.
DAY_WAKE_EARLIEST = 4 * 60
DAY_WAKE_LATEST = 11 * 60
# A workout this close to bedtime is left out of a shift worker's day.
MIN_MINUTES_BEFORE_SLEEP = 60

# Ramadan: wake this long before dawn for sehri, and train this long after iftar.
SEHRI_WAKE_LEAD = 75
RAMADAN_WORKOUT_AFTER_IFTAR = 75


def minutes(hhmm: str) -> int:
    hours, mins = hhmm.split(":")
    return int(hours) * 60 + int(mins)


def hhmm(total: int) -> str:
    total %= DAY_MINUTES
    return f"{total // 60:02d}:{total % 60:02d}"


def since(start: int, time: int) -> int:
    """Minutes from ``start`` to ``time`` going forward around the clock."""
    return (time - start) % DAY_MINUTES


def is_shift_schedule(lifestyle: Optional[dict]) -> bool:
    """True when meal times should follow the person's own wake and sleep times:
    night or rotating shifts with both times given, or any wake time outside
    usual morning hours."""
    lifestyle = lifestyle or {}
    wake, sleep = lifestyle.get("wake_time"), lifestyle.get("sleep_time")
    if not wake:
        return False
    if lifestyle.get("work_schedule") in SHIFT_SCHEDULES and sleep:
        return True
    return not DAY_WAKE_EARLIEST <= minutes(wake) <= DAY_WAKE_LATEST


def awake_minutes(lifestyle: Optional[dict]) -> int:
    """How long the person's waking day is, in minutes."""
    lifestyle = lifestyle or {}
    wake = minutes(lifestyle.get("wake_time") or DEFAULT_WAKE)
    sleep = minutes(lifestyle.get("sleep_time") or DEFAULT_SLEEP)
    return since(wake, sleep) or 16 * 60


def workout_window(lifestyle: Optional[dict], workout_time: Optional[str],
                   trains: bool) -> Optional[Tuple[int, int]]:
    """(start, end) in minutes for a usual training day, or None if not set.

    For shift workers the answer is read as a clock time; a workout that
    would fall while they sleep is left out rather than guessed.
    """
    if not trains or workout_time not in WORKOUT_START:
        return None
    start = minutes(WORKOUT_START[workout_time])
    wake = minutes((lifestyle or {}).get("wake_time") or DEFAULT_WAKE)
    if is_shift_schedule(lifestyle):
        offset = since(wake, start)
        if offset < MIN_MINUTES_AFTER_WAKE:
            offset = MIN_MINUTES_AFTER_WAKE
        if offset + WORKOUT_MINUTES > awake_minutes(lifestyle) - MIN_MINUTES_BEFORE_SLEEP:
            return None
        start = (wake + offset) % DAY_MINUTES
        return start, start + WORKOUT_MINUTES
    if workout_time in MORNING_WORKOUTS:
        start = max(start, wake + MIN_MINUTES_AFTER_WAKE)
    return start, start + WORKOUT_MINUTES


def ramadan_times(fasting_mode: Optional[dict]) -> Tuple[int, int]:
    """(dawn, sunset) in minutes for a Ramadan mode, from the person's local times."""
    fasting_mode = fasting_mode or {}
    return (
        minutes(fasting_mode.get("dawn_time") or DEFAULT_DAWN),
        minutes(fasting_mode.get("sunset_time") or DEFAULT_SUNSET),
    )


def is_ramadan(fasting_mode: Optional[dict]) -> bool:
    return bool(fasting_mode) and fasting_mode.get("mode") == "ramadan"


def daily_routine(meals: List[dict], lifestyle: Optional[dict], workout_time: Optional[str],
                  trains: bool, water_ml: Optional[int],
                  fasting_mode: Optional[dict] = None) -> List[dict]:
    """The day's timeline: each event has a time, a kind and the values its text needs.

    ``fasting_mode`` is the active mode (``{"mode": "ramadan", "dawn_time": ...}``) or None.
    """
    lifestyle = lifestyle or {}
    wake = lifestyle.get("wake_time") or DEFAULT_WAKE
    sleep = lifestyle.get("sleep_time") or DEFAULT_SLEEP
    window = workout_window(lifestyle, workout_time, trains)
    ramadan = is_ramadan(fasting_mode)
    extra: List[dict] = []
    if ramadan:
        dawn, sunset = ramadan_times(fasting_mode)
        wake = hhmm(dawn - SEHRI_WAKE_LEAD)
        extra.append({"time": hhmm(dawn), "kind": "fast_begins", "values": {}})
        start = sunset + RAMADAN_WORKOUT_AFTER_IFTAR
        window = (start, start + WORKOUT_MINUTES) if trains and workout_time else None
    events: List[dict] = [{
        "time": wake, "kind": "wake",
        "values": {"ml": WAKE_WATER_ML, "liters": round((water_ml or 0) / 1000, 1)},
    }, *extra]
    if window:
        events.append({"time": hhmm(window[0]), "kind": "workout", "values": {"minutes": WORKOUT_MINUTES}})
    for meal in meals:
        events.append({"time": meal["time"], "kind": "meal", "meal_id": meal["id"],
                       "values": {"kcal": round(meal["totals"]["kcal"])}})
    sleep_minutes = minutes(sleep)
    events.append({"time": hhmm(sleep_minutes - WIND_DOWN_LEAD), "kind": "wind_down", "values": {}})
    # Order by the waking day, so times after midnight (a 00:30 bedtime) come last.
    day_start = minutes(wake)
    events.sort(key=lambda e: since(day_start, minutes(e["time"])))
    hours_asleep = since(sleep_minutes, day_start) / 60
    events.append({"time": sleep, "kind": "sleep", "values": {"hours": round(hours_asleep, 1)}})
    return events
