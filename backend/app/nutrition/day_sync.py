"""Today's logs laid over the meal plan.

Whatever the user logged today (from the plan or by hand) is matched to a plan
slot, so the plan shows what was actually eaten. The meals still to come get
a portion hint, so the day lands near the targets without making a new plan.

Pure functions: the service passes in the plan meals, today's logs and the
targets, and gets back per-meal state plus a day summary.
"""
from typing import Any, Dict, List, Optional

# A gap smaller than this (kcal) between what's left and what's planned isn't
# worth a hint; neither is one under this share of the planned remainder.
MIN_ADJUST_KCAL = 100
MIN_ADJUST_SHARE = 0.08
# Portions are never suggested below or above these shares of the plan.
MIN_PORTION = 0.5
MAX_PORTION = 1.3
PORTION_STEP = 5  # percent
KCAL_STEP = 10
# Protein still missing (after the remaining meals) worth a nudge, in grams.
MIN_PROTEIN_GAP = 10


def _minutes(hhmm: Optional[str]) -> Optional[int]:
    try:
        hours, minutes = str(hhmm).split(":")
        return int(hours) * 60 + int(minutes)
    except (ValueError, AttributeError):
        return None


def plan_log_name(meal: dict) -> str:
    """The name a plan meal gets when it is logged from the plan."""
    return ", ".join(item["name"] for item in meal.get("items") or [])


def _closest(candidates: List[dict], at: Optional[int], taken: set) -> Optional[dict]:
    """The candidate slot nearest in time, preferring slots nothing has filled yet."""
    if not candidates:
        return None
    free = [m for m in candidates if m["id"] not in taken] or candidates
    if at is None:
        return free[0]

    def distance(meal: dict) -> int:
        slot = _minutes(meal.get("time"))
        if slot is None:
            return 24 * 60
        gap = abs(slot - at)
        return min(gap, 24 * 60 - gap)

    return min(free, key=distance)


def _round_to(value: float, step: int) -> int:
    return int(round(value / step) * step)


def _summary(log: dict) -> dict:
    return {
        "id": log["id"],
        "name": log["name"],
        "calories": round(log.get("calories") or 0),
        "protein": round(log.get("protein") or 0, 1),
        "eaten_at": log.get("eaten_at"),
        # When it was eaten, or else logged: places an off-plan snack in the day.
        "time": log.get("eaten_at") or log.get("time"),
    }


def sync_day(
    meals: List[dict],
    logged_ids: List[str],
    links: Dict[str, str],
    logs: List[dict],
    targets: Dict[str, Any],
) -> Dict[str, Any]:
    """Match today's logs to plan slots and work out the rest of the day.

    Args:
        meals: the plan meals (``id``, ``meal_type``, ``time``, ``items``, ``totals``).
        logged_ids: plan meal ids logged from the plan today.
        links: plan meal id -> the meal log it created (newer plans record this).
        logs: today's meal logs as dicts (``id``, ``name``, ``calories``,
            ``protein``, ``meal_type``, ``eaten_at``; ``time`` is the local
            "HH:MM" it was eaten or logged).
        targets: the plan's daily targets (``calories``, ``protein``).

    Returns:
        ``logged_ids``: plan meals still logged (a deleted log frees its slot),
        ``meals``: per plan meal id, its ``status`` (planned, logged or eaten),
        the logs matched to it and a portion ``adjust`` hint, and ``day``: what
        was eaten, what is left and any protein gap.
    """
    by_id = {log["id"]: log for log in logs}
    plan_logs: Dict[str, str] = {}
    for meal in meals:
        if meal["id"] not in logged_ids:
            continue
        link = links.get(meal["id"])
        if link:
            if link in by_id:  # Deleted from the food log: the slot is open again.
                plan_logs[meal["id"]] = link
            continue
        # Logged before links were recorded: find it by the name it was given.
        name = plan_log_name(meal)
        match = next((log for log in logs if log["name"] == name and log["id"] not in plan_logs.values()), None)
        plan_logs[meal["id"]] = match["id"] if match else ""

    used = set(plan_logs.values())
    eaten: Dict[str, List[dict]] = {meal["id"]: [] for meal in meals}
    extras: List[dict] = []
    taken = set(plan_logs)
    for log in logs:
        if log["id"] in used:
            continue
        same_type = [m for m in meals if log.get("meal_type") and m.get("meal_type") == log["meal_type"]]
        candidates = same_type if log.get("meal_type") else meals
        slot = _closest(candidates, _minutes(log.get("time") or log.get("eaten_at")), taken)
        if slot is None:
            extras.append(_summary(log))
            continue
        eaten[slot["id"]].append(_summary(log))
        taken.add(slot["id"])

    eaten_kcal = sum(log.get("calories") or 0 for log in logs)
    eaten_protein = sum(log.get("protein") or 0 for log in logs)
    target_kcal = float(targets.get("calories") or 0)
    target_protein = float(targets.get("protein") or 0)

    open_meals = [m for m in meals if m["id"] not in plan_logs and not eaten[m["id"]]]
    planned_kcal = sum(m["totals"]["kcal"] for m in open_meals)
    planned_protein = sum(m["totals"]["protein"] for m in open_meals)
    left_kcal = target_kcal - eaten_kcal
    factor = 1.0
    if open_meals and planned_kcal > 0 and logs:
        gap = left_kcal - planned_kcal
        if abs(gap) >= max(MIN_ADJUST_KCAL, planned_kcal * MIN_ADJUST_SHARE):
            factor = min(MAX_PORTION, max(MIN_PORTION, left_kcal / planned_kcal))

    result_meals: Dict[str, dict] = {}
    for meal in meals:
        status = "logged" if meal["id"] in plan_logs else ("eaten" if eaten[meal["id"]] else "planned")
        adjust = None
        if status == "planned" and factor != 1.0:
            percent = _round_to(factor * 100, PORTION_STEP)
            delta = _round_to(meal["totals"]["kcal"] * (percent / 100 - 1), KCAL_STEP)
            if percent != 100 and delta:
                adjust = {"portion_percent": percent, "kcal_delta": delta}
        entry: Dict[str, Any] = {"status": status, "eaten": eaten[meal["id"]], "adjust": adjust}
        if eaten[meal["id"]]:
            entry["eaten_totals"] = {
                "calories": round(sum(e["calories"] for e in eaten[meal["id"]])),
                "protein": round(sum(e["protein"] for e in eaten[meal["id"]]), 1),
            }
        result_meals[meal["id"]] = entry

    protein_gap = 0
    if open_meals and logs:
        missing = target_protein - eaten_protein - planned_protein * factor
        protein_gap = round(missing) if missing >= MIN_PROTEIN_GAP else 0

    if not logs:
        state = "not_started"
    elif left_kcal < -MIN_ADJUST_KCAL:
        state = "over"
    elif factor < 1:
        state = "ahead"
    elif factor > 1:
        state = "behind"
    else:
        state = "on_track"

    return {
        "logged_ids": [mid for mid, log_id in plan_logs.items()],
        "meals": result_meals,
        "day": {
            "eaten_kcal": round(eaten_kcal),
            "eaten_protein": round(eaten_protein, 1),
            "target_kcal": round(target_kcal),
            "target_protein": round(target_protein),
            "left_kcal": round(left_kcal),
            "meals_left": len(open_meals),
            "state": state,
            "protein_gap": protein_gap,
            "extras": extras,
        },
    }
