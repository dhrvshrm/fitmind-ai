"""Built-in context blocks for the coach's system prompt.

Each block is a short, factual line or two about the user. No names, emails
or other identifiers go to the AI provider. Register more with
``registry.register_context``.
"""
from typing import Optional

from app.coach.registry import register_context
from app.models.user import User
from app.services import (
    health_profile_service,
    nutrition_service,
    recovery_service,
    voice_service,
    workout_service,
)
from app.utils.time import local_now


@register_context
async def time_block(user_id: str) -> str:
    now = local_now()
    return f"Local time: {now.strftime('%A %H:%M')}."


@register_context
async def profile_block(user_id: str) -> Optional[str]:
    user = await User.get_by_id(user_id)
    if user is None:
        return None
    parts = [
        f"Goal: {user.fitness_goal or 'general fitness'}.",
        f"Experience: {user.experience_level or 'unspecified'}.",
    ]
    if user.weight_kg:
        parts.append(f"Weight: {user.weight_kg} kg.")
    if user.injuries:
        parts.append(f"Injuries or limitations: {', '.join(user.injuries)}.")
    prefs = getattr(user, "food_preferences", None) or {}
    if prefs.get("diet_type"):
        parts.append(f"Diet: {prefs['diet_type']}.")
    avoid = [*(prefs.get("allergies") or []), *(prefs.get("excluded") or [])]
    if avoid:
        parts.append(f"Must avoid: {', '.join(avoid)}.")
    return " ".join(parts)


@register_context
async def nutrition_block(user_id: str) -> str:
    summary = await nutrition_service.get_nutrition_summary(user_id)
    totals, goals = summary["totals"], summary["goals"]
    return (
        f"Eaten today: {totals['calories']:.0f} of {goals['calories']:.0f} kcal, "
        f"protein {totals['protein']:.0f} of {goals['protein']:.0f} g, "
        f"{summary['meals_logged']} meal(s) logged, water {summary['water_ml']} ml."
    )


@register_context
async def training_block(user_id: str) -> str:
    lines = [f"Latest recovery score: {await recovery_service.get_recovery_score(user_id)}/100."]
    voice = await voice_service.get_voice_history(user_id, limit=1)
    if voice:
        lines.append(f"Latest mood: {voice[0].mood} (energy {voice[0].energy_level}/10).")
    user = await User.get_by_id(user_id)
    today = await workout_service.get_today_workout(user) if user is not None else None
    if today and today["exercises"]:
        names = ", ".join(e.get("name", "") for e in today["exercises"][:6])
        lines.append(f"Today's workout ({today.get('focus') or 'session'}): {names}.")
    else:
        lines.append("No workout planned today.")
    return " ".join(lines)


@register_context
async def health_block(user_id: str) -> Optional[str]:
    """Consented health details (conditions, medicines, lab values, supplements).

    Empty without consent or answers, so the coach never assumes anything.
    """
    return await health_profile_service.health_context(user_id) or None
