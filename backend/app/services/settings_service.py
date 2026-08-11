import logging
from typing import Any, Dict

from app.models.user import DEFAULT_NOTIFICATION_PREFERENCES, User
from app.services import auth_service, user_service

logger = logging.getLogger(__name__)

# Profile fields that the "goals" update is allowed to change.
GOAL_FIELDS = ("fitness_goal", "experience_level", "available_equipment")


class SettingsError(Exception):
    """Raised when a settings operation is invalid (e.g. user not found)."""


async def get_profile(user_id: str) -> User:
    """Return the user's full profile.

    Raises:
        SettingsError: if the user does not exist.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise SettingsError("User not found")
    return user


async def update_profile(user_id: str, data: Dict[str, Any]) -> User:
    """Update editable profile fields (delegates to the user service)."""
    try:
        return await user_service.update_user_profile(user_id, data)
    except user_service.UserServiceError as exc:
        raise SettingsError(str(exc)) from exc


async def update_fitness_goals(user_id: str, data: Dict[str, Any]) -> User:
    """Update the user's fitness goal / experience / equipment fields.

    Raises:
        SettingsError: if the user does not exist.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise SettingsError("User not found")
    updates = {k: v for k, v in data.items() if k in GOAL_FIELDS and v is not None}
    if updates:
        await user.update(updates)
    logger.info("Updated fitness goals for user %s", user_id)
    return user


async def update_notification_preferences(
    user_id: str, prefs_dict: Dict[str, bool]
) -> Dict[str, bool]:
    """Merge and persist notification preference toggles.

    Only known keys (present in the defaults) are applied. Returns the full,
    merged preference map.

    Raises:
        SettingsError: if the user does not exist.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise SettingsError("User not found")
    changes = {
        k: bool(v)
        for k, v in prefs_dict.items()
        if k in DEFAULT_NOTIFICATION_PREFERENCES and v is not None
    }
    merged = {**user.notification_preferences, **changes}
    await user.update({"notification_preferences": merged})
    logger.info("Updated notification preferences for user %s", user_id)
    return merged


async def should_send_notification(user_id: str, notification_type: str) -> bool:
    """Return True if the user wants to receive this notification type.

    Types that aren't user-toggleable always return True; missing users also
    return True so system flows never silently drop notifications.
    """
    if notification_type not in DEFAULT_NOTIFICATION_PREFERENCES:
        return True
    user = await User.get_by_id(user_id)
    if user is None:
        return True
    return bool(user.notification_preferences.get(notification_type, True))


async def change_password(user_id: str, old_pwd: str, new_pwd: str) -> None:
    """Change the user's password (delegates to the auth service)."""
    try:
        await auth_service.change_password(user_id, old_pwd, new_pwd)
    except auth_service.AuthError as exc:
        raise SettingsError(str(exc)) from exc


async def delete_account(user_id: str) -> None:
    """Permanently delete the user's account (delegates to the auth service)."""
    try:
        await auth_service.delete_account(user_id)
    except auth_service.AuthError as exc:
        raise SettingsError(str(exc)) from exc
