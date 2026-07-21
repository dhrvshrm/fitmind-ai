import logging
from typing import AsyncIterator

from app.config.settings import get_settings
from app.models.user import User
from app.services import recovery_service, voice_service, workout_service

logger = logging.getLogger(__name__)

# System prompt framing the assistant's persona; user context is appended.
_BASE_SYSTEM_PROMPT = (
    "You are FitMind AI, a supportive and knowledgeable fitness coach. "
    "Give concise, encouraging, practical advice. Use the athlete's context "
    "below to personalise your answers when relevant.\n\n"
)


async def _build_context(user_id: str) -> str:
    """Assemble a short context block from the user's plan, recovery and mood."""
    lines = []

    user = await User.get_by_id(user_id)
    if user is not None:
        goal = user.fitness_goal or "general fitness"
        level = user.experience_level or "unspecified"
        lines.append(f"Athlete: {user.username}, goal={goal}, experience={level}.")

    recovery_score = await recovery_service.get_recovery_score(user_id)
    lines.append(f"Recovery score today: {recovery_score}/100.")

    voice = await voice_service.get_voice_history(user_id, limit=1)
    if voice:
        lines.append(f"Latest mood: {voice[0].mood} (energy {voice[0].energy_level}/10).")

    today_exercises = await workout_service.get_today_workout(user_id)
    if today_exercises:
        names = ", ".join(e.get("name", "") for e in today_exercises[:6])
        lines.append(f"Today's planned workout: {names}.")

    return "\n".join(lines)


def _fallback_reply(message: str) -> str:
    """Return a canned reply used when Groq is not configured."""
    return (
        "I'm your FitMind AI coach! AI chat isn't fully configured yet "
        "(set GROQ_API_KEY), but I'm here to help with workouts, recovery, "
        "and nutrition. Ask me anything once chat is enabled."
    )


async def generate_chat_response(user_id: str, message: str) -> AsyncIterator[str]:
    """Stream a coaching reply for ``message``, token by token.

    Builds context from the user's plan/recovery/mood, then streams tokens
    from Groq Llama 3. Falls back to a canned message (streamed word by word)
    when Groq is unavailable or the request fails.
    """
    settings = get_settings()
    context = await _build_context(user_id)
    system_prompt = _BASE_SYSTEM_PROMPT + context

    if not settings.GROQ_API_KEY:
        logger.info("GROQ_API_KEY not set — streaming fallback chat reply")
        for word in _fallback_reply(message).split(" "):
            yield word + " "
        return

    try:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        stream = await client.chat.completions.create(
            model=settings.GROQ_CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception as e:
        logger.warning("Groq chat streaming failed: %s", e)
        yield "Sorry, I'm having trouble responding right now. Please try again."
