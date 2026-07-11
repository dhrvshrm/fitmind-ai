import logging
from typing import Any, Dict

from app.models.user import User
from app.services import recovery_service

logger = logging.getLogger(__name__)


async def get_dashboard_summary(user: User) -> Dict[str, Any]:
    """Build the dashboard summary for a user.

    ``xp``/``level`` come from the user record and ``recovery_score`` from
    the user's latest recovery log (Day 5). The remaining metrics (streak,
    mood, workouts today) have no data source yet and default to zero; they
    are populated as later days add mood logging and workout tracking.
    """
    recovery_score = await recovery_service.get_recovery_score(user.id)
    return {
        "xp": user.xp,
        "level": user.level,
        # TODO(streak): derive from workout/activity history.
        "streak": 0,
        # TODO(mood): pull today's logged mood once mood logging exists.
        "mood_score": None,
        "recovery_score": recovery_score,
        # TODO(workouts): count today's completed workouts once tracking exists.
        "workouts_today": 0,
    }
