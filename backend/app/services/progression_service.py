"""Progressive overload for the user's workouts.

Stores the sets people log, tells them what to aim for next time, spots
personal records, suggests an easy week when lifts stall, and suggests a
level change when consistency and strength are there. The rules live in
app/workouts/progression.py; this module wires them to stored data.
"""
import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from app.models import exercise_log as store
from app.models.recovery import RecoveryLog
from app.models.user import User
from app.models.workout import WorkoutLog
from app.utils.time import local_today, local_today_iso
from app.workouts import catalog, programming, progression

logger = logging.getLogger(__name__)

# Equipment that takes added weight, so progress is tracked in kg.
LOADED_EQUIPMENT = {"dumbbell", "barbell", "cable", "machine", "kettlebells"}
MAX_SETS = 12
MAX_WEIGHT_KG = 500.0
MAX_REPS = 100
FELT_VALUES = {"easy", "right", "hard"}
# A dismissed suggestion stays quiet for this long.
SNOOZE_DAYS = 14
# Strength summary: how far back to look, and the comparison window for "change".
STRENGTH_WINDOW_DAYS = 120
STRENGTH_CHANGE_DAYS = 42
STRENGTH_MAX_LIFTS = 6
# A day counts toward average protein only when it has at least two meals
# logged, so a half-logged day doesn't look like low protein.
MIN_MEALS_FOR_PROTEIN_DAY = 2
# Main lifts for stall checks: compound patterns that take weight.
MAIN_PATTERNS = {"squat", "hinge", "lunge", "push_horizontal", "push_vertical", "pull_horizontal", "pull_vertical"}


class ProgressionError(Exception):
    def __init__(self, message: str, kind: str = "invalid"):
        super().__init__(message)
        self.kind = kind


def is_loaded(exercise: Optional[catalog.Exercise]) -> bool:
    return bool(exercise and exercise.equipment in LOADED_EQUIPMENT)


def _clean_sets(raw: Any) -> List[dict]:
    sets = []
    for item in (raw or [])[:MAX_SETS]:
        if not isinstance(item, dict):
            continue
        try:
            reps = int(item.get("reps") or 0)
            weight = float(item.get("weight_kg") or 0)
        except (TypeError, ValueError):
            continue
        if reps <= 0 or reps > MAX_REPS or weight < 0 or weight > MAX_WEIGHT_KG:
            continue
        sets.append({"weight_kg": round(weight, 2), "reps": reps})
    return sets


async def record_sets(user_id: str, exercises: List[dict], day: Optional[str] = None) -> List[dict]:
    """Save the sets from a logged workout and return any personal records set.

    Exercises without a catalogue id or without valid sets are skipped (older
    clients only send names and set counts).
    """
    day = day or local_today_iso()
    records = []
    for item in exercises:
        exercise_id = item.get("exercise_id") if isinstance(item, dict) else None
        exercise = catalog.get(exercise_id) if exercise_id else None
        if exercise is None:
            continue
        sets = _clean_sets(item.get("sets"))
        if not sets:
            continue
        if not is_loaded(exercise):
            sets = [{"weight_kg": 0.0, "reps": s["reps"]} for s in sets]
        felt = item.get("felt") if item.get("felt") in FELT_VALUES else None
        previous = await store.history(user_id, exercise.id, limit=50, before=day)
        doc = await store.save_session(user_id, exercise.id, exercise.name,
                                       exercise.coaching.pattern if exercise.coaching else None,
                                       day, sets, felt)
        today_session = progression.session_from_doc(doc)
        for record in progression.new_records(today_session, [progression.session_from_doc(d) for d in previous]):
            records.append({"exercise_id": exercise.id, "name": exercise.name, **record})
    return records


def _target_for(entry: dict, sessions: List[dict]) -> Optional[dict]:
    exercise = catalog.get(entry.get("exercise_id") or "")
    if exercise is None or exercise.coaching is None:
        return None
    rep_range = progression.parse_rep_range(str(entry.get("reps", "")))
    if rep_range is None:
        return None
    harder = catalog.get(exercise.coaching.harder) if exercise.coaching.harder else None
    target = progression.next_target(
        [progression.session_from_doc(d) for d in sessions],
        rep_range,
        int(entry.get("sets") or 1),
        loaded=is_loaded(exercise),
        pattern=exercise.coaching.pattern,
        harder_id=harder.id if harder else None,
    )
    target["loaded"] = is_loaded(exercise)
    if harder and target["action"] == "harder_variation":
        target["harder_name"] = harder.name
    return target


async def decorate_today(user: User, today: Dict[str, Any]) -> Dict[str, Any]:
    """Add each exercise's target for today, and apply an easy week if one is on."""
    exercises = today.get("exercises") or []
    state = await store.get_state(user.id)
    today_iso = local_today_iso()
    deload = bool(state.get("deload_until")) and state["deload_until"] >= today_iso
    if deload and not today.get("quick"):
        exercises = [progression.deload_entry(e) for e in exercises]
    ids = [e["exercise_id"] for e in exercises if e.get("exercise_id")]
    history = await store.histories(user.id, ids, before=today_iso)
    decorated = []
    for entry in exercises:
        target = _target_for(entry, history.get(entry.get("exercise_id") or "", []))
        if deload and target and target.get("weight_kg"):
            # Same weight as last time during an easy week, never more.
            last = (target.get("last") or {}).get("sets") or []
            target = {**target, "action": "deload", "weight_kg": max((s["weight_kg"] for s in last), default=None)}
        decorated.append({**entry, "target": target} if target else entry)
    return {**today, "exercises": decorated, "deload_until": state.get("deload_until") if deload else None}


async def _best_by_pattern(user_id: str, start: str) -> Dict[str, float]:
    best: Dict[str, float] = {}
    for doc in await store.since(user_id, start):
        pattern = doc.get("pattern")
        value = progression.best_estimated_max(progression.session_from_doc(doc))
        if pattern and value > best.get(pattern, 0):
            best[pattern] = value
    return best


async def _stalled_lifts(user_id: str, today: date) -> List[str]:
    start = (today - timedelta(days=progression.STALL_DAYS * 3)).isoformat()
    by_exercise: Dict[str, List[dict]] = {}
    for doc in await store.since(user_id, start):
        if doc.get("pattern") in MAIN_PATTERNS:
            by_exercise.setdefault(doc["exercise_id"], []).append(doc)
    stalled = []
    for exercise_id, docs in by_exercise.items():
        sessions = [progression.session_from_doc(d) for d in sorted(docs, key=lambda d: d["date"], reverse=True)]
        if progression.is_stalled(sessions, today):
            stalled.append(docs[-1]["name"])
    return stalled


def _snoozed(state: dict, key: str, today: date) -> bool:
    until = state.get(f"{key}_snoozed_until")
    return bool(until) and until >= today.isoformat()


async def _bodyweight_top_share(user_id: str, start: str) -> Optional[float]:
    latest: Dict[str, dict] = {}
    for doc in await store.since(user_id, start):
        latest[doc["exercise_id"]] = doc
    bodyweight = [d for d in latest.values() if not is_loaded(catalog.get(d["exercise_id"]))]
    if not bodyweight:
        return None
    at_top = 0
    for doc in bodyweight:
        exercise = catalog.get(doc["exercise_id"])
        reps = [s["reps"] for s in doc.get("sets", [])]
        rep_range = exercise.coaching.rep_range if exercise and exercise.coaching else None
        high = (rep_range or programming.BODYWEIGHT_REPS)[1]
        if reps and min(reps) >= high:
            at_top += 1
    return at_top / len(bodyweight)


async def _stall_reasons(user: User, today: date) -> List[dict]:
    """Protein, sleep and recovery over the stall window, from what the user logged."""
    from app.services import progress_service, user_service  # local: avoids a load-order cycle

    start = (today - timedelta(days=progression.REASON_WINDOW_DAYS)).isoformat()
    end = (today - timedelta(days=1)).isoformat()
    days = await progress_service.day_records(user.id, start, end, with_water=False)
    protein = [d["protein"] for d in days if d["meal_count"] >= MIN_MEALS_FOR_PROTEIN_DAY]
    targets = await user_service.get_targets(user) or {}
    recovery = [r for r in await RecoveryLog.get_history(user.id, days=progression.REASON_WINDOW_DAYS)
                if r.log_date >= start]
    return progression.stall_reasons(
        protein, targets.get("protein"), [r.sleep_hours for r in recovery], [r.score for r in recovery],
    )


async def suggestions(user: User) -> Dict[str, Any]:
    """An easy week when lifts have stalled, and a level change when the user is ready."""
    today = local_today()
    state = await store.get_state(user.id)
    deload_on = bool(state.get("deload_until")) and state["deload_until"] >= today.isoformat()

    deload = None
    if not deload_on and not _snoozed(state, "deload", today):
        stalled = await _stalled_lifts(user.id, today)
        if len(stalled) >= progression.STALLED_LIFTS_FOR_DELOAD:
            deload = {"stalled_lifts": stalled, "days": progression.DELOAD_DAYS,
                      "reasons": await _stall_reasons(user, today)}

    level = (user.experience_level or "beginner").lower()
    level_info = None
    if level in progression.NEXT_LEVEL:
        window = progression.LEVEL_RULES[progression.NEXT_LEVEL[level]]["window_days"]
        start = (today - timedelta(days=window)).isoformat()
        level_info = progression.level_check(
            level,
            await WorkoutLog.get_workout_dates(user.id),
            await _best_by_pattern(user.id, start),
            user.weight_kg,
            await _bodyweight_top_share(user.id, start),
            today,
            user.workout_days_per_week,
        )
        level_info["snoozed"] = _snoozed(state, "level", today)

    return {
        "deload": deload,
        "deload_until": state.get("deload_until") if deload_on else None,
        "level": level_info,
    }


async def start_deload(user: User) -> Dict[str, Any]:
    until = (local_today() + timedelta(days=progression.DELOAD_DAYS - 1)).isoformat()
    await store.update_state(user.id, {"deload_until": until})
    return {"deload_until": until}


async def end_deload(user: User) -> Dict[str, Any]:
    await store.update_state(user.id, {"deload_until": None})
    return {"deload_until": None}


async def snooze(user: User, kind: str) -> Dict[str, Any]:
    if kind not in ("deload", "level"):
        raise ProgressionError("Unknown suggestion")
    until = (local_today() + timedelta(days=SNOOZE_DAYS)).isoformat()
    await store.update_state(user.id, {f"{kind}_snoozed_until": until})
    return {"snoozed_until": until}


async def level_up(user: User) -> Dict[str, Any]:
    """Move to the next level (only when ready) and rebuild the weekly plan for it."""
    info = (await suggestions(user))["level"]
    if not info or not info.get("ready"):
        raise ProgressionError("Not ready for the next level yet", kind="not_ready")
    from app.services import workout_service  # local import: workout_service doesn't depend on this module

    new_level = info["next_level"]
    updated = await user.update({"experience_level": new_level})
    plan = await workout_service.generate_workout_plan(updated or user, experience_level=new_level)
    await store.update_state(user.id, {"level_snoozed_until": None, "leveled_up_at": local_today_iso()})
    return {"level": new_level, "plan_id": plan.id}


async def exercise_history(user: User, exercise_id: str) -> Dict[str, Any]:
    exercise = catalog.get(exercise_id)
    if exercise is None:
        raise ProgressionError("Exercise not found", kind="not_found")
    docs = await store.history(user.id, exercise_id, limit=60)
    sessions = []
    for doc in reversed(docs):
        session = progression.session_from_doc(doc)
        sessions.append({
            "date": doc["date"],
            "sets": doc.get("sets", []),
            "top_weight_kg": session.top_weight,
            "estimated_max_kg": progression.best_estimated_max(session),
            "best_reps": max((r for _, r in session.sets), default=0),
        })
    return {"exercise_id": exercise.id, "name": exercise.name, "loaded": is_loaded(exercise), "sessions": sessions}


async def strength_summary(user: User) -> Dict[str, Any]:
    """The user's most-trained weighted lifts with their estimated-max trend."""
    today = local_today()
    start = (today - timedelta(days=STRENGTH_WINDOW_DAYS)).isoformat()
    compare_from = (today - timedelta(days=STRENGTH_CHANGE_DAYS)).isoformat()
    by_exercise: Dict[str, List[dict]] = {}
    for doc in await store.since(user.id, start):
        if is_loaded(catalog.get(doc["exercise_id"])):
            by_exercise.setdefault(doc["exercise_id"], []).append(doc)

    lifts = []
    for exercise_id, docs in by_exercise.items():
        points = [{"date": d["date"], "estimated_max_kg": progression.best_estimated_max(progression.session_from_doc(d))}
                  for d in docs]
        points = [p for p in points if p["estimated_max_kg"] > 0]
        if not points:
            continue
        current = max(p["estimated_max_kg"] for p in points[-3:])
        baseline_points = [p for p in points if p["date"] >= compare_from] or points
        baseline = baseline_points[0]["estimated_max_kg"]
        change = round((current - baseline) / baseline * 100) if baseline and len(points) > 1 else None
        lifts.append({
            "exercise_id": exercise_id,
            "name": docs[-1]["name"],
            "sessions": len(points),
            "current_estimated_max_kg": current,
            "change_percent": change,
            "points": points,
        })
    lifts.sort(key=lambda lift: lift["sessions"], reverse=True)
    return {"lifts": lifts[:STRENGTH_MAX_LIFTS], "change_days": STRENGTH_CHANGE_DAYS}
