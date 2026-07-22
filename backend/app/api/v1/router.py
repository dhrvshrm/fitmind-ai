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
)

router = APIRouter(prefix="/api/v1")

router.include_router(health.router)
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(workouts.router)
router.include_router(recovery.router)
router.include_router(dashboard.router)
router.include_router(voice_checkin.router)
router.include_router(nutrition.router)
router.include_router(gamification.router)
router.include_router(notifications.router)
