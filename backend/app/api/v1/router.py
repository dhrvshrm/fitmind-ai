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
