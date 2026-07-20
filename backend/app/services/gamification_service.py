import logging
from datetime import date, timedelta
from typing import Any, Dict, List

from app.models.gamification import BADGE_CATALOG, LEVEL_TIERS, XP_REWARDS
from app.models.nutrition import Meal, count_days_hydration_goal_met
from app.models.recovery import RecoveryLog
from app.models.user import User
from app.models.voice_checkin import VoiceCheckin
from app.models.workout import WorkoutLog

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
    """Add XP to a user, recompute their level, and persist.

    Returns the XP awarded, new total, level number/title and whether the
    user reached a new tier.

    Raises:
        GamificationError: if the user does not exist.
    """
    user = await User.get_by_id(user_id)
    if user is None:
        raise GamificationError("User not found")

    old = calculate_level(user.xp)
    new_xp = user.xp + amount
    new = calculate_level(new_xp)
    await user.update({"xp": new_xp, "level": new["level"]})
    return {
        "xp_earned": amount,
        "total_xp": new_xp,
        "level": new["level"],
        "title": new["title"],
        "leveled_up": new["level"] > old["level"],
    }


# ---------------------------------------------------------------------------
# Streaks
# ---------------------------------------------------------------------------
async def _workout_streak(user_id: str) -> int:
    """Count consecutive days with a workout ending today (0 if none today)."""
    dates = set(await WorkoutLog.get_workout_dates(user_id))
    streak = 0
    day = date.today()
    while day.isoformat() in dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


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
    await user.update({"badges": user.badges + [badge_id]})
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

    # Single write covers streak refresh + any newly earned badges.
    await user.update(
        {
            "current_streak": streak,
            "longest_streak": longest,
            "badges": list(earned | set(new)),
        }
    )
    if new:
        logger.info("Awarded badges to user %s: %s", user_id, new)
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
