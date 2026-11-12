"""Flexible days: planned over-target days with a gentle rebalance.

A flexible day (a weekend, festival, wedding or travel day) gets extra
calories on purpose. To keep the week roughly on course, a small part of that
extra comes off the other days of the same Monday-Sunday week, but only days
on or after the day the flexible day was marked (the past isn't rewritten).

The rebalance is deliberately gentle:
- each day gives up at most 10% of its target and never more than 200 kcal,
- no day goes below the calorie floor,
- no reduction at all where the targets forbid a deficit,
- whatever doesn't fit within those limits is simply let go.
"""
from datetime import date, timedelta
from typing import Dict, List, Sequence

MAX_DAILY_REDUCTION_SHARE = 0.10
MAX_DAILY_REDUCTION_KCAL = 200
DEFAULT_EXTRA_KCAL = 500
MIN_EXTRA_KCAL = 100
MAX_EXTRA_KCAL = 1000
MAX_FLEX_DAYS_PER_WEEK = 2
REASONS = ("weekend", "festival", "wedding", "travel", "party", "other")


def week_start(day: date) -> date:
    """Monday of the week containing ``day``."""
    return day - timedelta(days=day.weekday())


def week_dates(start: date) -> List[str]:
    return [(start + timedelta(days=i)).isoformat() for i in range(7)]


def daily_cap(base_kcal: int, floor_kcal: int, no_deficit: bool) -> int:
    """Largest reduction one day can take."""
    if no_deficit:
        return 0
    return max(0, min(round(base_kcal * MAX_DAILY_REDUCTION_SHARE), MAX_DAILY_REDUCTION_KCAL, base_kcal - floor_kcal))


def plan_week(
    start: date,
    base_kcal: int,
    floor_kcal: int,
    flex_days: Sequence[dict],
    no_deficit: bool = False,
) -> Dict[str, dict]:
    """Calorie target per date for the week starting ``start`` (a Monday).

    ``flex_days`` are dicts with ``date``, ``extra_kcal`` and ``marked_on``
    (all ISO dates within or around the week; others are ignored).
    """
    dates = week_dates(start)
    flex = {f["date"]: f for f in flex_days if f["date"] in dates}
    cap = daily_cap(base_kcal, floor_kcal, no_deficit)
    reduction = {d: 0.0 for d in dates if d not in flex}

    for flex_date in sorted(flex):
        entry = flex[flex_date]
        eligible = [d for d in reduction if d >= entry.get("marked_on", flex_date)]
        if not eligible:
            continue
        share = entry["extra_kcal"] / len(eligible)
        for d in eligible:
            reduction[d] += min(share, cap - reduction[d])

    plan: Dict[str, dict] = {}
    for d in dates:
        if d in flex:
            extra = int(flex[d]["extra_kcal"])
            plan[d] = {"date": d, "base": base_kcal, "calories": base_kcal + extra, "adjustment": extra,
                       "flexible": True, "reason": flex[d].get("reason")}
        else:
            cut = int(round(reduction[d] / 10) * 10)
            cut = min(cut, cap)
            plan[d] = {"date": d, "base": base_kcal, "calories": base_kcal - cut, "adjustment": -cut,
                       "flexible": False, "reason": "rebalance" if cut else None}
    return plan
