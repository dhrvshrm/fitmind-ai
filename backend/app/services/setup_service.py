"""Instant setup: build the meal plan and workout plan as soon as onboarding is done.

The person lands on Today with both plans ready instead of looking for two
"create" buttons. Nothing here may block onboarding: every failure is logged
and reported as a status, never raised.
"""
import asyncio
import logging
from typing import Dict

from app.models.user import User
from app.services import diet_plan_service, workout_service

logger = logging.getLogger(__name__)

CREATED = "created"
PENDING = "pending"
FAILED = "failed"
# How long onboarding waits for the meal plan. If the AI is slow the plan keeps
# being built in the background and Today picks it up when it's ready.
MEAL_PLAN_WAIT_SECONDS = 12.0

# Plans still being built after onboarding returned (kept referenced until done).
_background: set = set()


async def _workout_plan(user: User) -> str:
    try:
        await workout_service.generate_workout_plan(user)
        return CREATED
    except Exception as e:
        logger.warning("Instant setup: workout plan failed for %s: %s", user.id, e)
        return FAILED


async def _meal_plan_task(user_id: str) -> str:
    try:
        await diet_plan_service.create_plan(user_id)
        return CREATED
    except Exception as e:
        logger.warning("Instant setup: meal plan failed for %s: %s", user_id, e)
        return FAILED


async def _meal_plan(user_id: str, wait_seconds: float) -> str:
    task = asyncio.create_task(_meal_plan_task(user_id))
    done, _ = await asyncio.wait({task}, timeout=wait_seconds)
    if task in done:
        return task.result()
    _background.add(task)
    task.add_done_callback(_background.discard)
    return PENDING


async def run(user: User, wait_seconds: float = MEAL_PLAN_WAIT_SECONDS) -> Dict[str, str]:
    """Create both plans for a user who just finished onboarding.

    Returns ``{"meal_plan": status, "workout_plan": status}`` where each status
    is ``created``, ``pending`` (still being built) or ``failed``.
    """
    try:
        workout_status = await _workout_plan(user)
        meal_status = await _meal_plan(user.id, wait_seconds)
    except Exception as e:  # Belt and braces: setup must never break onboarding.
        logger.warning("Instant setup failed for %s: %s", user.id, e)
        return {"meal_plan": FAILED, "workout_plan": FAILED}
    return {"meal_plan": meal_status, "workout_plan": workout_status}
