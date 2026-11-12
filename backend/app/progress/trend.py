"""Smoothed trend for noisy daily measurements (weight, waist, hip).

Scale weight jumps around by a kilo or more from water, salt and digestion, so
the app shows an exponentially weighted moving average (EWMA) instead of raw
readings. Gaps between weigh-ins are handled by giving a reading more weight
the longer it has been since the last one.

The weekly rate is the least-squares slope of the trend over the last few
weeks, which is steadier than "trend now minus trend a week ago".
"""
from datetime import date
from typing import Dict, List, Optional, Sequence, Tuple

# Share of each new day's reading folded into the trend. 0.1 is the classic
# Hacker's Diet value; 0.15 reacts a little faster for people who weigh in
# only a few times a week.
TREND_ALPHA = 0.15
# Window used for the weekly rate of change.
RATE_WINDOW_DAYS = 28
# Needed before a rate is reported at all.
MIN_RATE_READINGS = 3
MIN_RATE_SPAN_DAYS = 7
# Below this change per week (kg or cm) the trend counts as steady.
STEADY_THRESHOLD = {"weight": 0.1, "waist": 0.2, "hip": 0.2}

Reading = Tuple[str, float]  # (ISO date, value)


def _day(iso: str) -> date:
    return date.fromisoformat(iso)


def ewma(readings: Sequence[Reading], alpha: float = TREND_ALPHA) -> List[float]:
    """Trend value at each reading (readings sorted oldest first).

    A reading after a gap of ``g`` days gets weight ``1 - (1 - alpha) ** g``,
    the same as if the trend had been updated daily with that value.
    """
    trend: List[float] = []
    previous: Optional[Tuple[date, float]] = None
    for iso, value in readings:
        current = _day(iso)
        if previous is None:
            smoothed = value
        else:
            gap = max((current - previous[0]).days, 1)
            weight = 1 - (1 - alpha) ** gap
            smoothed = previous[1] + weight * (value - previous[1])
        trend.append(smoothed)
        previous = (current, smoothed)
    return trend


def slope_per_day(points: Sequence[Tuple[str, float]]) -> Optional[float]:
    """Least-squares slope (units per day) through dated points, or None if flat in time."""
    if len(points) < 2:
        return None
    origin = _day(points[0][0])
    xs = [(_day(d) - origin).days for d, _ in points]
    ys = [v for _, v in points]
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    var_x = sum((x - mean_x) ** 2 for x in xs)
    if var_x == 0:
        return None
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    return cov / var_x


def direction(rate_per_week: Optional[float], kind: str = "weight") -> Optional[str]:
    """``down``, ``up`` or ``steady`` for a weekly rate, or None without a rate."""
    if rate_per_week is None:
        return None
    threshold = STEADY_THRESHOLD.get(kind, 0.1)
    if rate_per_week <= -threshold:
        return "down"
    if rate_per_week >= threshold:
        return "up"
    return "steady"


def summarize(readings: Sequence[Reading], kind: str = "weight") -> Dict[str, object]:
    """Points with their trend plus a summary (current trend, weekly rate, direction).

    ``readings`` must be sorted oldest first, one per date.
    """
    trend = ewma(readings)
    points = [
        {"date": d, "value": round(v, 2), "trend": round(t, 2)}
        for (d, v), t in zip(readings, trend)
    ]
    rate: Optional[float] = None
    if readings:
        end = _day(readings[-1][0])
        recent = [
            (d, t) for (d, _), t in zip(readings, trend) if (end - _day(d)).days < RATE_WINDOW_DAYS
        ]
        span = (end - _day(recent[0][0])).days if recent else 0
        if len(recent) >= MIN_RATE_READINGS and span >= MIN_RATE_SPAN_DAYS:
            per_day = slope_per_day(recent)
            rate = round(per_day * 7, 2) if per_day is not None else None
    return {
        "points": points,
        "summary": {
            "entries": len(readings),
            "latest": round(readings[-1][1], 2) if readings else None,
            "current_trend": round(trend[-1], 2) if trend else None,
            "start_trend": round(trend[0], 2) if trend else None,
            "change": round(trend[-1] - trend[0], 2) if len(trend) >= 2 else 0.0,
            "weekly_rate": rate,
            "direction": direction(rate, kind),
        },
    }

