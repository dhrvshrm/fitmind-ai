"""A day built around the person's routine: wake-up, workout, meals, wind-down, sleep.

Rules only. Times come from the answers already given (wake and sleep time,
when they train, how many days a week), and meals are placed around the
workout: a light pre-workout snack and a protein-rich meal after.
"""
from typing import Dict, List, Optional, Tuple

DEFAULT_WAKE = "07:00"
DEFAULT_SLEEP = "23:00"
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


def minutes(hhmm: str) -> int:
    hours, mins = hhmm.split(":")
    return int(hours) * 60 + int(mins)


def hhmm(total: int) -> str:
    total %= 24 * 60
    return f"{total // 60:02d}:{total % 60:02d}"


def workout_window(lifestyle: Optional[dict], workout_time: Optional[str],
                   trains: bool) -> Optional[Tuple[int, int]]:
    """(start, end) in minutes for a usual training day, or None if not set."""
    if not trains or workout_time not in WORKOUT_START:
        return None
    start = minutes(WORKOUT_START[workout_time])
    wake = minutes((lifestyle or {}).get("wake_time") or DEFAULT_WAKE)
    if workout_time in MORNING_WORKOUTS:
        start = max(start, wake + MIN_MINUTES_AFTER_WAKE)
    return start, start + WORKOUT_MINUTES


def daily_routine(meals: List[dict], lifestyle: Optional[dict], workout_time: Optional[str],
                  trains: bool, water_ml: Optional[int]) -> List[dict]:
    """The day's timeline: each event has a time, a kind and the values its text needs."""
    lifestyle = lifestyle or {}
    wake = lifestyle.get("wake_time") or DEFAULT_WAKE
    sleep = lifestyle.get("sleep_time") or DEFAULT_SLEEP
    events: List[dict] = [{
        "time": wake, "kind": "wake",
        "values": {"ml": WAKE_WATER_ML, "liters": round((water_ml or 0) / 1000, 1)},
    }]
    window = workout_window(lifestyle, workout_time, trains)
    if window:
        events.append({"time": hhmm(window[0]), "kind": "workout", "values": {"minutes": WORKOUT_MINUTES}})
    for meal in meals:
        events.append({"time": meal["time"], "kind": "meal", "meal_id": meal["id"],
                       "values": {"kcal": round(meal["totals"]["kcal"])}})
    sleep_minutes = minutes(sleep)
    events.append({"time": hhmm(sleep_minutes - WIND_DOWN_LEAD), "kind": "wind_down", "values": {}})
    # Order by the waking day, so times after midnight (a 00:30 bedtime) come last.
    day_start = minutes(wake)
    events.sort(key=lambda e: (minutes(e["time"]) - day_start) % (24 * 60))
    hours_asleep = ((day_start - sleep_minutes) % (24 * 60)) / 60
    events.append({"time": sleep, "kind": "sleep", "values": {"hours": round(hours_asleep, 1)}})
    return events
