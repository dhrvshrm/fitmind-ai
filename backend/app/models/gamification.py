"""Static gamification definitions: XP rewards, level tiers and badges.

These are the single source of truth for the gamification rules, referenced
by ``gamification_service`` and any feature service that awards XP.
"""

from typing import Dict, List, Tuple

# XP awarded for each type of activity.
XP_REWARDS: Dict[str, int] = {
    "workout": 50,
    "meal": 20,
    "voice_checkin": 15,
    "recovery": 10,
    "full_week": 100,
}

# Level tiers as (minimum_xp, title), ordered ascending. The level number is
# the tier's 1-based position.
LEVEL_TIERS: List[Tuple[int, str]] = [
    (0, "Rookie"),
    (200, "Starter"),
    (500, "Athlete"),
    (1000, "Pro"),
    (2000, "Elite"),
    (3500, "Champion"),
    (5500, "Legend"),
]

# Badge catalog: id -> metadata. ``requirement`` is human-readable; the actual
# conditions are evaluated in ``gamification_service.check_badge_conditions``.
BADGE_CATALOG: Dict[str, Dict[str, str]] = {
    "seven_day_warrior": {
        "name": "7-Day Warrior",
        "description": "Complete a 7-day workout streak.",
    },
    "recovery_king": {
        "name": "Recovery King",
        "description": "Log 5 good recovery scores.",
    },
    "clean_eater": {
        "name": "Clean Eater",
        "description": "Hit your calorie goal on 7 days.",
    },
    "voice_native": {
        "name": "Voice Native",
        "description": "Record 14 voice check-ins.",
    },
    "century_club": {
        "name": "Century Club",
        "description": "Complete 100 workouts.",
    },
    "hydration_hero": {
        "name": "Hydration Hero",
        "description": "Hit your water goal on 7 days.",
    },
}
