"""Adaptive maintenance estimate (energy balance back-calculation).

If someone ate an average of ``I`` kcal a day over a few weeks while their
weight trend moved ``s`` kg per day, their real maintenance is roughly
``I - s * 7700`` (about 7,700 kcal per kg of body weight). That estimate is
compared with the current target, and a new target is suggested only when it
differs meaningfully. The user always decides; nothing changes on its own.

Guards:
- At least 14 reasonably complete logged days and 7 weigh-ins spanning two
  weeks inside the last 28 days, otherwise "not enough data" with what's missing.
- Days that look half-logged (under 50% of target, or under 800 kcal) are left
  out of the intake average, since they would make maintenance look too low.
- A result far from the formula estimate is treated as a logging problem, not
  a metabolism finding, and no change is suggested.
- One suggestion moves the target by at most 200 kcal, and never below the
  calorie floor; no deficit is added where the targets forbid one.
"""
from datetime import date, timedelta
from typing import Dict, List, Optional, Sequence

from app.nutrition.targets import KCAL_PER_KG_FAT
from app.progress.trend import Reading, slope_per_day

WINDOW_DAYS = 28
MIN_LOGGED_DAYS = 14
MIN_WEIGH_INS = 7
MIN_WEIGH_IN_SPAN_DAYS = 14
COMPLETE_DAY_MIN_KCAL = 800
COMPLETE_DAY_MIN_SHARE = 0.5
# Change smaller than this isn't worth asking about.
MEANINGFUL_CHANGE_KCAL = 100
# Largest move a single suggestion makes.
MAX_STEP_KCAL = 200
# Further from the formula TDEE than this share is most likely missed logging.
MAX_DEVIATION_FROM_FORMULA = 0.35
# After the user accepts or dismisses, wait this long before asking again.
COOLDOWN_DAYS = 7
NO_DEFICIT_FLAGS = ("no_deficit_minor", "no_deficit_pregnancy", "minor", "pregnancy_or_breastfeeding")


def complete_days(intake: Dict[str, float], target_kcal: float) -> Dict[str, float]:
    """Days whose logged calories look like a full day of eating."""
    threshold = max(COMPLETE_DAY_MIN_KCAL, COMPLETE_DAY_MIN_SHARE * target_kcal)
    return {d: kcal for d, kcal in intake.items() if kcal >= threshold}


def estimate(
    *,
    today: date,
    intake: Dict[str, float],
    weights: Sequence[Reading],
    targets: dict,
    floor_kcal: int,
    last_decision: Optional[str] = None,
) -> dict:
    """Adaptive target status for the 28 days before ``today``.

    ``intake`` maps ISO date -> logged kcal, ``weights`` are (date, kg) oldest
    first, ``targets`` is the user's stored targets dict. Returns a dict with
    ``status`` (``insufficient_data``, ``low_confidence``, ``on_track``,
    ``cooldown`` or ``suggestion``) and the numbers behind it.
    """
    start = (today - timedelta(days=WINDOW_DAYS)).isoformat()
    end = (today - timedelta(days=1)).isoformat()
    current = int(targets.get("calories") or 0)
    formula_tdee = int(targets.get("tdee") or 0)
    adjustment = int(targets.get("adjustment_kcal") or 0)

    window_intake = {d: k for d, k in intake.items() if start <= d <= end}
    full_days = complete_days(window_intake, current)
    # Food days end yesterday (today isn't finished); a weigh-in is done once
    # it's logged, so this morning's counts too.
    window_weights = [(d, w) for d, w in weights if start <= d <= today.isoformat()]
    span = 0
    if len(window_weights) >= 2:
        span = (date.fromisoformat(window_weights[-1][0]) - date.fromisoformat(window_weights[0][0])).days

    base: Dict[str, object] = {
        "window_days": WINDOW_DAYS,
        "logged_days": len(full_days),
        "required_logged_days": MIN_LOGGED_DAYS,
        "weigh_ins": len(window_weights),
        "required_weigh_ins": MIN_WEIGH_INS,
        "weigh_in_span_days": span,
        "required_span_days": MIN_WEIGH_IN_SPAN_DAYS,
        "current_target": current,
        "formula_tdee": formula_tdee,
    }

    missing: List[str] = []
    if len(full_days) < MIN_LOGGED_DAYS:
        missing.append("logged_days")
    if len(window_weights) < MIN_WEIGH_INS:
        missing.append("weigh_ins")
    if span < MIN_WEIGH_IN_SPAN_DAYS:
        missing.append("weigh_in_span")
    if missing or not current:
        return {**base, "status": "insufficient_data", "missing": missing}

    # A straight-line fit through the window's weigh-ins: steady against day-to-day
    # noise, and without the start-up lag a smoothed trend has.
    slope = slope_per_day(window_weights) or 0.0
    avg_intake = sum(full_days.values()) / len(full_days)
    estimated_tdee = avg_intake - slope * KCAL_PER_KG_FAT
    result = {
        **base,
        "average_intake": round(avg_intake),
        "weekly_weight_change": round(slope * 7, 2),
        "estimated_tdee": round(estimated_tdee),
    }

    if formula_tdee and abs(estimated_tdee - formula_tdee) > MAX_DEVIATION_FROM_FORMULA * formula_tdee:
        return {**result, "status": "low_confidence"}

    flags = targets.get("flags") or []
    goal_adjustment = adjustment
    if any(f in flags for f in NO_DEFICIT_FLAGS):
        goal_adjustment = max(goal_adjustment, 0)
    ideal = estimated_tdee + goal_adjustment
    ideal = max(ideal, floor_kcal)
    diff = ideal - current
    if abs(diff) < MEANINGFUL_CHANGE_KCAL:
        return {**result, "status": "on_track"}

    step = max(-MAX_STEP_KCAL, min(MAX_STEP_KCAL, diff))
    suggested = int(round((current + step) / 10) * 10)
    suggested = max(suggested, floor_kcal)
    if suggested == current:
        return {**result, "status": "on_track"}

    if last_decision and (today - date.fromisoformat(last_decision)).days < COOLDOWN_DAYS:
        return {**result, "status": "cooldown", "next_check": (date.fromisoformat(last_decision) + timedelta(days=COOLDOWN_DAYS)).isoformat()}

    return {
        **result,
        "status": "suggestion",
        "suggested_target": suggested,
        "change": suggested - current,
        "capped": abs(diff) > MAX_STEP_KCAL,
    }
