from fastapi import APIRouter
from .endpoints import (
    auth,
    users,
    workouts,
    recovery,
    health,
    dashboard,
    voice_checkin,
    nutrition,
    gamification,
    notifications,
    friends,
    reports,
    settings,
    diet_plans,
    exercises,
    tips,
)

from .endpoints import activity, food_scan  # Phase 11 activity; barcode and photo logging
from .endpoints import analytics, reminders, today  # Phase 7 habit loop
from .endpoints import coach  # Phase 9 action-taking coach
from .endpoints import progress  # Phase 10 progress and motivation
from .endpoints import health_profile, lab_reports, supplements  # Phases 12-14 health

router = APIRouter(prefix="/api/v1")

router.include_router(health.router)
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(workouts.router)
router.include_router(exercises.router)
router.include_router(tips.router)
router.include_router(recovery.router)
router.include_router(dashboard.router)
router.include_router(voice_checkin.router)
router.include_router(nutrition.router)
router.include_router(diet_plans.router)
router.include_router(gamification.router)
router.include_router(notifications.router)
router.include_router(friends.router)
router.include_router(friends.leaderboard_router)
router.include_router(reports.router)
router.include_router(settings.router)
router.include_router(activity.router)
router.include_router(food_scan.router)
router.include_router(analytics.router)
router.include_router(reminders.router)
router.include_router(today.router)
router.include_router(coach.router)
router.include_router(progress.router)
router.include_router(progress.challenges_router)
router.include_router(health_profile.router)
router.include_router(lab_reports.router)
router.include_router(supplements.router)
