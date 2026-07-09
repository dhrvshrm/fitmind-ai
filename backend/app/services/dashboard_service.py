import logging
from typing import Any, Dict

from app.models.user import User

logger = logging.getLogger(__name__)


async def get_dashboard_summary(user: User) -> Dict[str, Any]:
    """Build the dashboard summary for a user.

    ``xp`` and ``level`` come from the user record. The remaining metrics
    (streak, mood, recovery, workouts today) have no data source yet and
    default to zero; they are populated as later days add mood logging,
    recovery scoring, and workout tracking.
    """
    return {
        "xp": user.xp,
        "level": user.level,
        # TODO(streak): derive from workout/activity history.
        "streak": 0,
        # TODO(mood): pull today's logged mood once mood logging exists.
        "mood_score": None,
        # TODO(recovery): pull today's recovery score once recovery exists.
        "recovery_score": None,
        # TODO(workouts): count today's completed workouts once tracking exists.
        "workouts_today": 0,
    }
