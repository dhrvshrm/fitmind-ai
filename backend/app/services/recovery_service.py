import logging
from typing import Any, Dict, List, Tuple

from app.models.recovery import RecoveryLog

logger = logging.getLogger(__name__)

# Recommendation + explanation for each recovery band, ordered by the
# minimum score that qualifies (checked high to low).
_RECOVERY_BANDS: List[Tuple[int, str, str]] = [
    (
        80,
        "Fully recovered - go for a high-intensity session.",
        "Your body is well rested and ready to handle heavy training today.",
    ),
    (
        60,
        "Good recovery - a normal training session is fine.",
        "You've recovered reasonably well; train as planned but listen to your body.",
    ),
    (
        40,
        "Moderate recovery - keep it light today.",
        "Recovery is below par. Favour lighter volume, mobility, or technique work.",
    ),
    (
        0,
        "Low recovery - prioritise rest and sleep.",
        "Your body needs recovery. Rest, hydrate, and focus on sleep before training hard.",
    ),
]


def calculate_recovery_score(
    sleep_hours: float,
    sleep_quality: int,
    stress_level: int,
    soreness: int,
) -> int:
    """Compute a 0-100 recovery score from the daily check-in metrics.

    Formula::

        score = (sleep_hours * 10) + (sleep_quality * 10)
                + ((5 - stress_level) * 10) + ((5 - soreness) * 5)

    The result is clamped to the ``[0, 100]`` range.
    """
    score = (
        (sleep_hours * 10)
        + (sleep_quality * 10)
        + ((5 - stress_level) * 10)
        + ((5 - soreness) * 5)
    )
    return max(0, min(100, int(round(score))))


def _band_for_score(score: int) -> Tuple[str, str]:
    """Return the (recommendation, explanation) pair for a score."""
    for minimum, recommendation, explanation in _RECOVERY_BANDS:
        if score >= minimum:
            return recommendation, explanation
    # Unreachable (last band has minimum 0), but keeps the type checker happy.
    return _RECOVERY_BANDS[-1][1], _RECOVERY_BANDS[-1][2]


def get_recommendation(score: int) -> str:
    """Return a short training recommendation for the given score."""
    return _band_for_score(score)[0]


def get_explanation(score: int) -> str:
    """Return a longer explanation for the given score."""
    return _band_for_score(score)[1]


async def log_recovery(user_id: str, data: Dict[str, Any]) -> RecoveryLog:
    """Compute a recovery score from ``data`` and persist it for the user."""
    score = calculate_recovery_score(
        sleep_hours=data["sleep_hours"],
        sleep_quality=data["sleep_quality"],
        stress_level=data["stress_level"],
        soreness=data["muscle_soreness"],
    )
    log = RecoveryLog(
        user_id=user_id,
        sleep_hours=data["sleep_hours"],
        sleep_quality=data["sleep_quality"],
        stress_level=data["stress_level"],
        muscle_soreness=data["muscle_soreness"],
        score=score,
    )
    await log.save()
    logger.info("Logged recovery for user %s: score %s", user_id, score)
    return log


async def get_recovery_score(user_id: str) -> int:
    """Return the user's most recent recovery score, or 0 if none logged."""
    latest = await RecoveryLog.get_latest_for_user(user_id)
    return latest.score if latest else 0


async def get_recovery_history(user_id: str, days: int = 14) -> List[RecoveryLog]:
    """Return the user's recovery logs, newest first, capped at ``days``."""
    return await RecoveryLog.get_history(user_id, days=days)
