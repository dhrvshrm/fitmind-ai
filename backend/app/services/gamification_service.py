import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List

from pymongo.errors import DuplicateKeyError

from app.config.database import get_database
from app.models.gamification import BADGE_CATALOG, LEVEL_TIERS, XP_REWARDS
from app.models.nutrition import Meal, count_days_hydration_goal_met
from app.models.recovery import RecoveryLog
from app.models.user import User
from app.models.voice_checkin import VoiceCheckin
from app.models.workout import WorkoutLog
from app.services import notification_service
from app.utils.time import local_today, local_today_iso

logger = logging.getLogger(__name__)

# Badge thresholds.
WARRIOR_STREAK = 7
RECOVERY_KING_COUNT = 5
GOOD_RECOVERY_THRESHOLD = 70
VOICE_NATIVE_COUNT = 14
CENTURY_COUNT = 100
CLEAN_EATER_DAYS = 7
CLEAN_EATER_TOLERANCE = 0.15
DEFAULT_TDEE = 2000
HYDRATION_GOAL_ML = 2000
HYDRATION_HERO_DAYS = 7

# How many times per local day each action earns XP. Logging more is allowed,
# it just stops paying out, so repeated logs can't be used to farm XP.
DAILY_XP_CAPS: Dict[str, int] = {
    "workout": 1,
    "recovery": 1,
    "voice_checkin": 1,
    "meal": 5,
}

# Ledger of XP payouts; one document per paid-out action slot.
XP_EVENTS_COLLECTION = "xp_events"
_XP_EVENTS_MEMORY: Dict[str, dict] = {}

# Badge ids (kept aligned with app.models.gamification.BADGE_CATALOG).
BADGE_SEVEN_DAY_WARRIOR = "seven_day_warrior"
BADGE_RECOVERY_KING = "recovery_king"
BADGE_CLEAN_EATER = "clean_eater"
BADGE_VOICE_NATIVE = "voice_native"
BADGE_CENTURY_CLUB = "century_club"
BADGE_HYDRATION_HERO = "hydration_hero"


class GamificationError(Exception):
    """Raised when a gamification operation fails (e.g. user not found)."""


# ---------------------------------------------------------------------------
# Levels & XP
# ---------------------------------------------------------------------------
def calculate_level(xp: int) -> Dict[str, Any]:
    """Return level details for an XP total.

    Includes the 1-based level number, title, progress into the current tier
    and XP remaining to the next tier.
    """
    idx = 0
    for i, (min_xp, _title) in enumerate(LEVEL_TIERS):
        if xp >= min_xp:
            idx = i
        else:
            break

    current_min, title = LEVEL_TIERS[idx]
    if idx + 1 < len(LEVEL_TIERS):
        next_min, next_title = LEVEL_TIERS[idx + 1]
        xp_to_next = next_min - xp
    else:
        next_title, xp_to_next = None, 0

    return {
        "level": idx + 1,
        "title": title,
        "current_xp": xp,
        "xp_into_level": xp - current_min,
        "xp_to_next": xp_to_next,
        "next_title": next_title,
    }


async def award_xp(user_id: str, amount: int) -> Dict[str, Any]:
    """Atomically add XP to a user, recompute their level, and persist.

    Server-side only: clients can't award XP directly. Use
    :func:`award_action_xp` for user actions so daily caps apply.

    Returns the XP awarded, new total, level number/title and whether the
    user reached a new tier.

    Raises:
        GamificationError: if the user does not exist.
    """
    new_xp = await User.increment_xp(user_id, amount)
    if new_xp is None:
        raise GamificationError("User not found")

    old = calculate_level(new_xp - amount)
    new = calculate_level(new_xp)
    if new["level"] != old["level"]:
        user = await User.get_by_id(user_id)
        if user is not None:
            await user.update({"level": new["level"]})
    return {
        "xp_earned": amount,
        "total_xp": new_xp,
        "level": new["level"],
        "title": new["title"],
        "leveled_up": new["level"] > old["level"],
    }


async def _claim_xp_slot(user_id: str, action: str, day: str) -> bool:
    """Reserve the next XP payout slot for ``action`` today.

    Returns False once the daily cap is reached. Each slot has a unique key,
    so two concurrent requests can't both claim the same one.
    """
    cap = DAILY_XP_CAPS.get(action, 1)
    db = get_database()
    if db is not None:
        used = await db[XP_EVENTS_COLLECTION].count_documents(
            {"user_id": user_id, "action": action, "local_date": day}
        )
        if used >= cap:
            return False
        try:
            await db[XP_EVENTS_COLLECTION].insert_one(
                {
                    "user_id": user_id,
                    "action": action,
                    "local_date": day,
                    "key": f"{action}:{day}:{used}",
                    "amount": XP_REWARDS[action],
                    "created_at": datetime.now(timezone.utc),
                }
            )
        except DuplicateKeyError:
            return False
        return True

    for slot in range(cap):
        key = f"{user_id}:{action}:{day}:{slot}"
        if key not in _XP_EVENTS_MEMORY:
            _XP_EVENTS_MEMORY[key] = {"user_id": user_id, "action": action, "local_date": day}
            return True
    return False


async def award_action_xp(user_id: str, action: str) -> Dict[str, Any]:
    """Award the XP for a user action, respecting its daily cap.

    Returns the same shape as :func:`award_xp`; ``xp_earned`` is 0 once the
    day's cap for ``action`` is reached.
    """
    if action not in XP_REWARDS:
        raise GamificationError(f"Unknown XP action: {action}")
    if await _claim_xp_slot(user_id, action, local_today_iso()):
        return await award_xp(user_id, XP_REWARDS[action])
    return await award_xp(user_id, 0)


# ---------------------------------------------------------------------------
# Streaks
# ---------------------------------------------------------------------------
async def workout_streak_ending(user_id: str, last_day: date) -> int:
    """Count consecutive days with a workout ending on ``last_day`` (0 if none that day)."""
    dates = set(await WorkoutLog.get_workout_dates(user_id))
    streak = 0
    day = last_day
    while day.isoformat() in dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


async def _workout_streak(user_id: str) -> int:
    """Count consecutive days with a workout ending today (0 if none today)."""
    return await workout_streak_ending(user_id, local_today())


async def update_streak(user_id: str) -> int:
    """Recompute and persist the user's current/longest workout streak."""
    user = await User.get_by_id(user_id)
    if user is None:
        return 0
    current = await _workout_streak(user_id)
    longest = max(user.longest_streak, current)
    await user.update({"current_streak": current, "longest_streak": longest})
    return current


# ---------------------------------------------------------------------------
# Badges
# ---------------------------------------------------------------------------
async def _count_good_recovery(user_id: str) -> int:
    """Count recovery logs at or above the "good" score threshold."""
    logs = await RecoveryLog.get_history(user_id, days=365)
    return sum(1 for log in logs if log.score >= GOOD_RECOVERY_THRESHOLD)


async def _count_voice_checkins(user_id: str) -> int:
    """Count the user's total voice check-ins."""
    return len(await VoiceCheckin.get_history(user_id, limit=1000))


async def _count_clean_eating_days(user_id: str, user: User) -> int:
    """Count days where total calories fell within tolerance of the goal."""
    goal = float(user.tdee or DEFAULT_TDEE)
    low, high = goal * (1 - CLEAN_EATER_TOLERANCE), goal * (1 + CLEAN_EATER_TOLERANCE)
    count = 0
    for day in await Meal.get_dates(user_id):
        meals = await Meal.get_by_date(user_id, day)
        calories = sum(m.calories for m in meals)
        if low <= calories <= high:
            count += 1
    return count


async def award_badge(user_id: str, badge_id: str) -> bool:
    """Award a badge to a user if valid and not already held.

    Returns True if the badge was newly awarded.
    """
    if badge_id not in BADGE_CATALOG:
        return False
    user = await User.get_by_id(user_id)
    if user is None or badge_id in user.badges:
        return False
    await User.add_badges(user_id, [badge_id])
    logger.info("Awarded badge '%s' to user %s", badge_id, user_id)
    return True


async def check_badge_conditions(user_id: str) -> List[str]:
    """Evaluate all badge conditions, award any newly earned, and refresh streak.

    Returns the list of newly awarded badge ids.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        return []

    earned = set(user.badges)
    streak = await _workout_streak(user_id)
    longest = max(user.longest_streak, streak)
    new: List[str] = []

    if BADGE_SEVEN_DAY_WARRIOR not in earned and streak >= WARRIOR_STREAK:
        new.append(BADGE_SEVEN_DAY_WARRIOR)
    if BADGE_CENTURY_CLUB not in earned:
        if await WorkoutLog.count_for_user(user_id) >= CENTURY_COUNT:
            new.append(BADGE_CENTURY_CLUB)
    if BADGE_RECOVERY_KING not in earned:
        if await _count_good_recovery(user_id) >= RECOVERY_KING_COUNT:
            new.append(BADGE_RECOVERY_KING)
    if BADGE_VOICE_NATIVE not in earned:
        if await _count_voice_checkins(user_id) >= VOICE_NATIVE_COUNT:
            new.append(BADGE_VOICE_NATIVE)
    if BADGE_CLEAN_EATER not in earned:
        if await _count_clean_eating_days(user_id, user) >= CLEAN_EATER_DAYS:
            new.append(BADGE_CLEAN_EATER)
    if BADGE_HYDRATION_HERO not in earned:
        hydrated_days = await count_days_hydration_goal_met(user_id, HYDRATION_GOAL_ML)
        if hydrated_days >= HYDRATION_HERO_DAYS:
            new.append(BADGE_HYDRATION_HERO)

    # Streak fields are written alone and badges are added atomically, so
    # XP or badge changes made by concurrent requests aren't overwritten.
    await user.update({"current_streak": streak, "longest_streak": longest})
    await User.add_badges(user_id, new)
    if new:
        logger.info("Awarded badges to user %s: %s", user_id, new)
        for badge_id in new:
            name = BADGE_CATALOG.get(badge_id, {}).get("name", badge_id)
            await notification_service.create_notification(
                user_id,
                notification_service.TYPE_BADGE_EARNED,
                f"You earned the '{name}' badge!",
                meta={"badge_id": badge_id},
            )
    return new


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------
def _badge_detail(badge_id: str) -> Dict[str, str]:
    """Return a badge's public metadata."""
    meta = BADGE_CATALOG.get(badge_id, {})
    return {
        "id": badge_id,
        "name": meta.get("name", badge_id),
        "description": meta.get("description", ""),
    }


async def get_gamification_profile(user_id: str) -> Dict[str, Any]:
    """Return the user's full gamification profile.

    Raises:
        GamificationError: if the user does not exist.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise GamificationError("User not found")

    level = calculate_level(user.xp)
    streak = await _workout_streak(user_id)
    badges = [_badge_detail(b) for b in user.badges if b in BADGE_CATALOG]
    return {
        "xp": user.xp,
        "level": level["level"],
        "title": level["title"],
        "next_title": level["next_title"],
        "xp_into_level": level["xp_into_level"],
        "xp_to_next": level["xp_to_next"],
        "current_streak": streak,
        "longest_streak": max(user.longest_streak, streak),
        "badges": badges,
        "badge_count": len(badges),
    }


def list_all_badges() -> List[Dict[str, str]]:
    """Return the full badge catalog (for discovery/UX)."""
    return [_badge_detail(bid) for bid in BADGE_CATALOG]
