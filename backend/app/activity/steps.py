"""Steps: default targets and the activity level they imply.

Banding of average daily steps (Tudor-Locke and Bassett, "How many steps/day
are enough? Preliminary pedometer indices for public health", Sports Medicine
2004; 34(1):1-8, with the 12,500 "highly active" cut-off):

    under 5,000        sedentary
    5,000 to 7,499     light       ("low active")
    7,500 to 9,999     moderate    ("somewhat active")
    10,000 to 12,499   active
    12,500 and over    very_active ("highly active")

Steps don't see gym sessions, cycling or swimming, so a step-based level is
only allowed to move the self-reported level by one band either way, and it
never jumps more than one band from the level used last time. The calorie
safety floors live in ``app/nutrition/targets.py`` and still apply on top.

Default step targets follow the dose-response evidence that mortality
benefit levels off around 8,000 to 10,000 steps a day for adults under 60
and 6,000 to 8,000 for adults 60 and over (Paluch et al., Lancet Public
Health 2022; 7(3):e219-e228). The target starts a little above what the
person already does so it is reachable, not a jump to 10,000.
"""
from typing import List, Optional, Sequence

ACTIVITY_BANDS: List[str] = ["sedentary", "light", "moderate", "active", "very_active"]
# Lower bound of average daily steps for each band after the first.
STEP_BAND_LOWER_BOUNDS = (5000, 7500, 10000, 12500)

# At least this many logged days within the recent window before steps count.
MIN_DAYS_FOR_ESTIMATE = 7
RECENT_WINDOW_DAYS = 14

DEFAULT_TARGET_BY_LEVEL = {
    "sedentary": 6000,
    "light": 7000,
    "moderate": 8000,
    "active": 10000,
    "very_active": 10000,
}
FAT_LOSS_EXTRA_STEPS = 1000
TARGET_CAP_UNDER_60 = 10000
TARGET_CAP_60_PLUS = 8000
MIN_STEP_TARGET = 1000
MAX_STEP_TARGET = 50000
MAX_DAILY_STEPS = 100000


def band_for_steps(average_steps: float) -> str:
    """The activity band for an average daily step count (see module docstring)."""
    index = sum(1 for bound in STEP_BAND_LOWER_BOUNDS if average_steps >= bound)
    return ACTIVITY_BANDS[index]


def _rank(level: Optional[str]) -> Optional[int]:
    return ACTIVITY_BANDS.index(level) if level in ACTIVITY_BANDS else None


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def derive_level(
    recent_steps: Sequence[int],
    self_reported: Optional[str],
    previous: Optional[str],
) -> Optional[str]:
    """The activity level steps support, or None to use the self-reported one.

    ``recent_steps`` are the logged days in the recent window. With fewer than
    :data:`MIN_DAYS_FOR_ESTIMATE` days there is not enough data and None is
    returned. Otherwise the band of the average is limited to one band from
    the self-reported level and one band from ``previous`` (the level used
    last time, or the self-reported one when steps weren't used before).
    """
    if len(recent_steps) < MIN_DAYS_FOR_ESTIMATE:
        return None
    candidate = ACTIVITY_BANDS.index(band_for_steps(sum(recent_steps) / len(recent_steps)))
    reported = _rank(self_reported)
    if reported is not None:
        candidate = _clamp(candidate, reported - 1, reported + 1)
    last = _rank(previous) if previous else reported
    if last is not None:
        candidate = _clamp(candidate, last - 1, last + 1)
    return ACTIVITY_BANDS[candidate]


def effective_level(self_reported: Optional[str], step_level: Optional[str]) -> Optional[str]:
    """The level targets should use: the step-based one kept within a band of
    the self-reported level, else the self-reported level."""
    step_rank = _rank(step_level)
    if step_rank is None:
        return self_reported
    reported = _rank(self_reported)
    if reported is None:
        return step_level
    return ACTIVITY_BANDS[_clamp(step_rank, reported - 1, reported + 1)]


def default_step_target(activity_level: Optional[str], goal: Optional[str], age: Optional[int]) -> int:
    """A reachable daily step target from the activity level, goal and age."""
    target = DEFAULT_TARGET_BY_LEVEL.get(activity_level or "", DEFAULT_TARGET_BY_LEVEL["light"])
    if goal == "fat_loss":
        target += FAT_LOSS_EXTRA_STEPS
    cap = TARGET_CAP_60_PLUS if (age or 0) >= 60 else TARGET_CAP_UNDER_60
    return min(target, cap)
