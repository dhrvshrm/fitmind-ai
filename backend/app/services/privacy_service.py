import logging
from typing import Dict, List

from app.config.database import get_database
from app.models import (
    audit,
    diet_plan,
    food_library,
    friend,
    notification,
    nutrition,
    recovery,
    report,
    user,
    voice_checkin,
    weight,
    workout,
)
from app.services import cloud_service, gamification_service, workout_service
from app.models import activity
from app.models import coach as coach_store
from app.models import analytics as analytics_store, push as push_store
from app.models import challenge as challenge_store, progress as progress_store
from app.models import consent as consent_store, health_profile as health_profile_store  # Phases 12-14
from app.models import lab_report as lab_report_store, supplement as supplement_store
from app.models import fasting_mode as fasting_mode_store  # Phase 8
from app.models import exercise_log as exercise_log_store

logger = logging.getLogger(__name__)

# Every collection holding a user's own data, mapped to the field(s) that
# reference the user. New collections with user data MUST be added here so
# account deletion stays complete.
USER_DATA_COLLECTIONS: Dict[str, List[str]] = {
    "users": ["id"],
    "meals": ["user_id"],
    "water_intake": ["user_id"],
    "recovery_logs": ["user_id"],
    "voice_checkins": ["user_id"],
    "weight_logs": ["user_id"],
    "workout_plans": ["user_id"],
    "workout_logs": ["user_id"],
    "workout_progress": ["user_id"],
    "notifications": ["user_id"],
    "weekly_reports": ["user_id"],
    "friendships": ["requester_id", "addressee_id"],
    "xp_events": ["user_id"],
    "audit_logs": ["user_id"],
    "ai_usage": ["user_id"],
    "saved_meals": ["user_id"],
    "user_foods": ["user_id"],
    "diet_plans": ["user_id"],
    "workout_overrides": ["user_id"],
    "step_logs": ["user_id"],
    "activity_settings": ["user_id"],
    "coach_conversations": ["user_id"],
    "coach_messages": ["user_id"],
    "coach_proposals": ["user_id"],
    "analytics_events": ["user_id"],
    "push_subscriptions": ["user_id"],
    "reminder_settings": ["user_id"],
    "reminder_sends": ["user_id"],
    # Phase 10 progress and motivation.
    "body_measurements": ["user_id"],
    "flexible_days": ["user_id"],
    "target_history": ["user_id"],
    "weekly_insights": ["user_id"],
    "progress_photos": ["user_id"],
    "friend_challenges": ["creator_id", "opponent_id"],
    # Phases 12-14 health (report files in R2 are removed via cloud_service prefixes).
    "consents": ["user_id"],
    "health_profiles": ["user_id"],
    "health_reports": ["user_id"],
    "health_report_files": ["user_id"],
    "biomarkers": ["user_id"],
    "user_supplements": ["user_id"],
    "supplement_logs": ["user_id"],
    # Phase 8 fasting and festival modes.
    "fasting_modes": ["user_id"],
    # Progressive overload.
    "exercise_logs": ["user_id"],
    "training_state": ["user_id"],
}


def _memory_stores() -> List[dict]:
    """Return the in-memory fallback stores (local development only)."""
    return [
        user._MEMORY_STORE,
        nutrition._MEAL_MEMORY,
        nutrition._WATER_MEMORY,
        recovery._MEMORY_STORE,
        voice_checkin._MEMORY_STORE,
        weight._MEMORY_STORE,
        workout._MEMORY_STORE,
        workout._WORKOUT_LOG_MEMORY,
        workout_service._PROGRESS_MEMORY,
        notification._MEMORY_STORE,
        report._MEMORY_STORE,
        friend._MEMORY_STORE,
        gamification_service._XP_EVENTS_MEMORY,
        audit._MEMORY_STORE,
        food_library._SAVED_MEAL_MEMORY,
        food_library._USER_FOOD_MEMORY,
        diet_plan._MEMORY_STORE,
        workout._OVERRIDE_MEMORY,
        activity._STEPS_MEMORY,
        activity._SETTINGS_MEMORY,
        coach_store._CONVERSATION_MEMORY,
        coach_store._MESSAGE_MEMORY,
        coach_store._PROPOSAL_MEMORY,
        analytics_store._MEMORY_STORE,
        push_store._SUBSCRIPTION_MEMORY,
        push_store._SETTINGS_MEMORY,
        push_store._SEND_MEMORY,
        progress_store._MEASUREMENTS_MEMORY,
        progress_store._FLEX_MEMORY,
        progress_store._TARGET_HISTORY_MEMORY,
        progress_store._INSIGHTS_MEMORY,
        progress_store._PHOTOS_MEMORY,
        challenge_store._MEMORY_STORE,
        consent_store._MEMORY_STORE,
        health_profile_store._MEMORY_STORE,
        lab_report_store._REPORT_MEMORY,
        lab_report_store._FILE_MEMORY,
        lab_report_store._BIOMARKER_MEMORY,
        supplement_store._SUPPLEMENT_MEMORY,
        supplement_store._LOG_MEMORY,
        fasting_mode_store._MEMORY_STORE,
        exercise_log_store._MEMORY_STORE,
        exercise_log_store._STATE_MEMORY,
    ]


def _belongs_to(key: str, value: object, user_id: str) -> bool:
    """True if an in-memory entry is the user's (by owner field or key prefix)."""
    if key == user_id or key.startswith(f"{user_id}:"):
        return True
    if isinstance(value, dict):
        return user_id in (value.get("id"), value.get("user_id"), value.get("requester_id"), value.get("addressee_id"),
                           value.get("creator_id"), value.get("opponent_id"))
    return False


async def delete_user_data(user_id: str) -> Dict[str, int]:
    """Permanently delete everything stored for a user, including files.

    Returns the number of records removed per collection (plus ``files``).
    """
    removed: Dict[str, int] = {}
    db = get_database()
    if db is not None:
        for collection, fields in USER_DATA_COLLECTIONS.items():
            query = {"$or": [{field: user_id} for field in fields]}
            result = await db[collection].delete_many(query)
            removed[collection] = result.deleted_count
    else:
        for store in _memory_stores():
            for key in [k for k, v in store.items() if _belongs_to(str(k), v, user_id)]:
                del store[key]

    removed["files"] = await cloud_service.delete_user_files(user_id)
    logger.info("Deleted all data for user %s: %s", user_id, removed)
    return removed
