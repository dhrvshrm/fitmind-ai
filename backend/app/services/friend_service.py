import logging
from datetime import date, timedelta
from typing import Any, Dict, List

from app.models.friend import STATUS_ACCEPTED, STATUS_PENDING, Friendship
from app.models.gamification import XP_REWARDS
from app.models.nutrition import Meal
from app.models.recovery import RecoveryLog
from app.models.user import User
from app.models.voice_checkin import VoiceCheckin
from app.models.workout import WorkoutLog
from app.services import notification_service

logger = logging.getLogger(__name__)

# Number of days included in the "weekly" leaderboard window.
WEEKLY_WINDOW_DAYS = 7


class FriendServiceError(Exception):
    """Raised when a friend operation is invalid (bad request, not found)."""


async def _weekly_xp(user_id: str) -> int:
    """Estimate XP earned in the last 7 days from logged activity.

    Counts recent workouts, meals, voice check-ins and recovery logs and
    multiplies each by its XP reward, giving a fair week-over-week ranking
    metric even though the stored ``xp`` total is cumulative.
    """
    cutoff = (date.today() - timedelta(days=WEEKLY_WINDOW_DAYS - 1)).isoformat()

    workouts = sum(
        1 for w in await WorkoutLog.get_history(user_id, days=500) if w.log_date >= cutoff
    )
    recoveries = sum(
        1 for r in await RecoveryLog.get_history(user_id, days=500) if r.log_date >= cutoff
    )
    voices = sum(
        1 for v in await VoiceCheckin.get_history(user_id, limit=1000) if v.log_date >= cutoff
    )
    meals = 0
    for day in await Meal.get_dates(user_id):
        if day >= cutoff:
            meals += len(await Meal.get_by_date(user_id, day))

    return (
        workouts * XP_REWARDS["workout"]
        + meals * XP_REWARDS["meal"]
        + voices * XP_REWARDS["voice_checkin"]
        + recoveries * XP_REWARDS["recovery"]
    )


async def send_friend_request(from_user: str, to_user: str) -> Friendship:
    """Send a friend request from ``from_user`` to ``to_user``.

    Raises:
        FriendServiceError: on self-request, unknown recipient, or an
            existing pending/accepted relationship.
    """
    if from_user == to_user:
        raise FriendServiceError("You cannot friend yourself")

    recipient = await User.get_by_id(to_user)
    if recipient is None:
        raise FriendServiceError("Recipient user not found")

    existing = await Friendship.find_between(from_user, to_user)
    if existing is not None:
        if existing.status == STATUS_ACCEPTED:
            raise FriendServiceError("You are already friends")
        raise FriendServiceError("A friend request is already pending")

    friendship = await Friendship(from_user, to_user, STATUS_PENDING).save()

    sender = await User.get_by_id(from_user)
    sender_name = sender.username if sender else "Someone"
    await notification_service.create_notification(
        to_user,
        notification_service.TYPE_FRIEND_REQUEST,
        f"{sender_name} sent you a friend request.",
        meta={"request_id": friendship.id, "from_user_id": from_user},
    )
    logger.info("Friend request %s -> %s", from_user, to_user)
    return friendship


async def accept_friend_request(user_id: str, request_id: str) -> Friendship:
    """Accept a pending friend request addressed to ``user_id``.

    Raises:
        FriendServiceError: if the request is missing, not addressed to this
            user, or not pending.
    """
    friendship = await Friendship.get_by_id(request_id)
    if friendship is None:
        raise FriendServiceError("Friend request not found")
    if friendship.addressee_id != user_id:
        raise FriendServiceError("This request is not addressed to you")
    if friendship.status != STATUS_PENDING:
        raise FriendServiceError("This request is not pending")

    await friendship.update_status(STATUS_ACCEPTED)

    accepter = await User.get_by_id(user_id)
    accepter_name = accepter.username if accepter else "Someone"
    await notification_service.create_notification(
        friendship.requester_id,
        notification_service.TYPE_FRIEND_ACCEPTED,
        f"{accepter_name} accepted your friend request!",
        meta={"friend_id": user_id},
    )
    logger.info("Friend request %s accepted by %s", request_id, user_id)
    return friendship


async def get_friends_list(user_id: str) -> List[Dict[str, Any]]:
    """Return the user's accepted friends as public profiles."""
    friendships = await Friendship.get_accepted_for(user_id)
    friends: List[Dict[str, Any]] = []
    for friendship in friendships:
        friend = await User.get_by_id(friendship.other_user(user_id))
        if friend is not None:
            friends.append(
                {
                    "id": friend.id,
                    "username": friend.username,
                    "level": friend.level,
                    "xp": friend.xp,
                    "current_streak": friend.current_streak,
                }
            )
    return friends


async def get_leaderboard(user_id: str) -> List[Dict[str, Any]]:
    """Return the user and their friends ranked by weekly XP (highest first)."""
    friendships = await Friendship.get_accepted_for(user_id)
    user_ids = {user_id} | {f.other_user(user_id) for f in friendships}

    rows: List[Dict[str, Any]] = []
    for uid in user_ids:
        user = await User.get_by_id(uid)
        if user is None:
            continue
        rows.append(
            {
                "user_id": uid,
                "username": user.username,
                "weekly_xp": await _weekly_xp(uid),
                "level": user.level,
                "is_me": uid == user_id,
            }
        )

    rows.sort(key=lambda r: r["weekly_xp"], reverse=True)
    for rank, row in enumerate(rows, start=1):
        row["rank"] = rank
    return rows


async def send_nudge(from_user: str, to_user: str) -> None:
    """Send a nudge notification from one friend to another.

    Raises:
        FriendServiceError: if the two users are not accepted friends.
    """
    friendship = await Friendship.find_between(from_user, to_user)
    if friendship is None or friendship.status != STATUS_ACCEPTED:
        raise FriendServiceError("You can only nudge your friends")

    sender = await User.get_by_id(from_user)
    sender_name = sender.username if sender else "A friend"
    await notification_service.create_notification(
        to_user,
        notification_service.TYPE_NUDGE,
        f"{sender_name} nudged you — time to work out! 💪",
        meta={"from_user_id": from_user},
    )
    logger.info("Nudge %s -> %s", from_user, to_user)


async def search_user(username: str, requesting_user_id: str) -> Dict[str, Any]:
    """Look up a user by username and include the friendship status.

    Raises:
        FriendServiceError: if no user has that username.
    """
    user = await User.get_by_username(username)
    if user is None:
        raise FriendServiceError("User not found")

    status = "none"
    if user.id != requesting_user_id:
        friendship = await Friendship.find_between(requesting_user_id, user.id)
        if friendship is not None:
            status = friendship.status
    else:
        status = "self"

    return {
        "id": user.id,
        "username": user.username,
        "level": user.level,
        "friendship_status": status,
    }
