from fastapi import APIRouter
from .endpoints import auth, users, workouts, recovery

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(workouts.router)
router.include_router(recovery.router)
