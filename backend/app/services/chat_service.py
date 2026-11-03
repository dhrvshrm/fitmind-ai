import logging
from typing import AsyncIterator

from app.ai import client as ai_client
from app.ai.client import AIError, AIQuotaError
from app.ai.style import STYLE_GUIDE
from app.models.user import User
from app.services import nutrition_service, recovery_service, voice_service, workout_service

logger = logging.getLogger(__name__)

# System prompt framing the coach; the user's live context is appended.
_BASE_SYSTEM_PROMPT = (
    "You are FitMind's coach: an experienced fitness and nutrition coach who knows "
    "this person's data. Answer their question directly and practically, using the "
    "context below when it is relevant. If the context doesn't contain something, "
    "say you don't have that data rather than guessing.\n\n"
    + STYLE_GUIDE
    + "\nContext about this person (today):\n"
)

# Shown when chat can't reach a model. Honest about the failure, no fake answer.
_UNAVAILABLE_REPLY = "I can't reach the coaching model right now. Please try again in a minute."
_QUOTA_REPLY = "You've reached today's limit for coach messages. It resets tomorrow."


async def _build_context(user_id: str) -> str:
    """Assemble a short context block from the user's profile, plan and logs."""
    lines = []

    user = await User.get_by_id(user_id)
    if user is not None:
        goal = user.fitness_goal or "general fitness"
        level = user.experience_level or "unspecified"
        lines.append(f"Name: {user.username}. Goal: {goal}. Experience: {level}.")
        if user.weight_kg:
            lines.append(f"Weight: {user.weight_kg} kg.")
        if user.injuries:
            lines.append(f"Injuries or limitations: {', '.join(user.injuries)}.")

    recovery_score = await recovery_service.get_recovery_score(user_id)
    lines.append(f"Latest recovery score: {recovery_score}/100.")

    voice = await voice_service.get_voice_history(user_id, limit=1)
    if voice:
        lines.append(f"Latest mood: {voice[0].mood} (energy {voice[0].energy_level}/10).")

    today_exercises = await workout_service.get_today_workout(user_id)
    if today_exercises:
        names = ", ".join(e.get("name", "") for e in today_exercises[:6])
        lines.append(f"Today's planned workout: {names}.")
    else:
        lines.append("No workout planned today.")

    nutrition = await nutrition_service.get_nutrition_summary(user_id)
    totals, goals = nutrition["totals"], nutrition["goals"]
    lines.append(
        f"Eaten today: {totals['calories']:.0f} of {goals['calories']:.0f} kcal, "
        f"protein {totals['protein']:.0f} of {goals['protein']:.0f} g, "
        f"{nutrition['meals_logged']} meal(s) logged, water {nutrition['water_ml']} ml."
    )

    return "\n".join(lines)


async def generate_chat_response(user_id: str, message: str) -> AsyncIterator[str]:
    """Stream a coaching reply for ``message``, token by token.

    Builds context from the user's profile, plan, recovery, mood and today's
    nutrition, then streams from the chat model. When the model is
    unavailable or the daily quota is used up, yields a short, honest message
    instead of a fabricated answer.
    """
    context = await _build_context(user_id)
    messages = [
        {"role": "system", "content": _BASE_SYSTEM_PROMPT + context},
        {"role": "user", "content": message},
    ]
    try:
        async for token in ai_client.stream_chat(messages, user_id=user_id):
            yield token
    except AIQuotaError:
        yield _QUOTA_REPLY
    except AIError as e:
        logger.warning("Chat unavailable for user %s: %s", user_id, e)
        yield _UNAVAILABLE_REPLY
