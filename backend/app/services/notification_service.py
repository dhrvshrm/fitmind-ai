import logging
from typing import Any, Dict, List, Optional

from app.models.notification import Notification
from app.websockets.manager import manager

logger = logging.getLogger(__name__)

# Supported notification types. Sources for some (follow, friend_accepted,
# leaderboard_change, weekly_report) arrive with their feature systems; the
# types are defined here so those systems can emit them without changes.
TYPE_FOLLOW = "follow"
TYPE_FRIEND_ACCEPTED = "friend_accepted"
TYPE_NUDGE = "nudge"
TYPE_BADGE_EARNED = "badge_earned"
TYPE_STREAK_WARNING = "streak_warning"
TYPE_WORKOUT_LOGGED = "workout_logged"
TYPE_LEVEL_UP = "level_up"
TYPE_WEEKLY_REPORT = "weekly_report"
TYPE_LEADERBOARD_CHANGE = "leaderboard_change"

NOTIFICATION_TYPES = {
    TYPE_FOLLOW,
    TYPE_FRIEND_ACCEPTED,
    TYPE_NUDGE,
    TYPE_BADGE_EARNED,
    TYPE_STREAK_WARNING,
    TYPE_WORKOUT_LOGGED,
    TYPE_LEVEL_UP,
    TYPE_WEEKLY_REPORT,
    TYPE_LEADERBOARD_CHANGE,
}


async def create_notification(
    user_id: str,
    type: str,
    message: str,
    meta: Optional[Dict[str, Any]] = None,
) -> Notification:
    """Create a notification: push live over WebSocket if the user is online,
    otherwise store it for delivery on their next connection.

    The notification is always persisted (for history and offline delivery);
    ``delivered`` is set to True only when it was pushed live.
    """
    online = manager.is_connected(user_id)
    notification = Notification(
        user_id=user_id, type=type, message=message, meta=meta, delivered=online
    )
    await notification.save()

    if online:
        await manager.send_personal(
            user_id, {"type": "notification", "data": notification.public_dict()}
        )
        logger.info("Pushed live notification '%s' to user %s", type, user_id)
    else:
        logger.info("Stored notification '%s' for offline user %s", type, user_id)
    return notification


async def deliver_pending(user_id: str) -> int:
    """Push any undelivered notifications to a now-online user.

    Returns the number delivered. Called when a WebSocket connects.
    """
    pending = await Notification.get_undelivered(user_id)
    if not pending:
        return 0
    for notification in pending:
        await manager.send_personal(
            user_id, {"type": "notification", "data": notification.public_dict()}
        )
    await Notification.mark_delivered([n.id for n in pending])
    logger.info("Delivered %d pending notifications to user %s", len(pending), user_id)
    return len(pending)


async def get_notifications(user_id: str, limit: int = 50) -> List[Notification]:
    """Return the user's notifications, newest first."""
    return await Notification.get_for_user(user_id, limit=limit)


async def mark_read(user_id: str, notification_id: str) -> bool:
    """Mark a notification as read. Returns True if one was updated."""
    return await Notification.mark_read(user_id, notification_id)


async def get_unread_count(user_id: str) -> int:
    """Return the user's unread notification count."""
    return await Notification.unread_count(user_id)
