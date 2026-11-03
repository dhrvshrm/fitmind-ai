import logging
import re
from typing import Tuple

from pydantic import BaseModel, Field

from app.ai import client as ai_client
from app.ai.client import AIError
from app.models.voice_checkin import VoiceCheckin
from app.services import cloud_service

logger = logging.getLogger(__name__)

# Neutral defaults used when transcription or mood analysis is unavailable.
DEFAULT_MOOD = "neutral"
DEFAULT_ENERGY = 5

# Lightweight keyword heuristic for the no-Gemini fallback.
_POSITIVE_WORDS = {"good", "great", "happy", "energised", "energized", "strong", "motivated", "excited", "amazing", "refreshed"}
_NEGATIVE_WORDS = {"tired", "exhausted", "sore", "stressed", "bad", "low", "sad", "drained", "sick", "anxious", "weak"}


async def transcribe_audio(audio_bytes: bytes, user_id: str, filename: str = "audio.webm") -> str:
    """Transcribe audio using Groq Whisper.

    Returns an empty string when Groq is not configured or the call fails,
    so the check-in flow can continue without transcription.
    """
    try:
        return await ai_client.transcribe(audio_bytes, filename, user_id=user_id)
    except AIError as e:
        logger.warning("Transcription unavailable: %s", e)
        return ""


def _fallback_mood(transcript: str) -> Tuple[str, int]:
    """Estimate mood/energy from keywords when Gemini is unavailable."""
    if not transcript:
        return DEFAULT_MOOD, DEFAULT_ENERGY
    words = set(re.findall(r"[a-z']+", transcript.lower()))
    positives = len(words & _POSITIVE_WORDS)
    negatives = len(words & _NEGATIVE_WORDS)
    if positives > negatives:
        return "positive", 7
    if negatives > positives:
        return "low", 4
    return DEFAULT_MOOD, DEFAULT_ENERGY


class _MoodResult(BaseModel):
    """Mood analysis as returned by the model."""

    mood: str = Field(..., min_length=1, max_length=30)
    energy_level: int = Field(..., ge=1, le=10)


async def analyze_mood_from_transcript(transcript: str, user_id: str) -> Tuple[str, int]:
    """Analyse a transcript for mood and energy (1-10).

    Falls back to a keyword heuristic when AI is unavailable or the response
    is invalid. Always returns ``(mood, energy_level)`` with energy in
    ``[1, 10]``.
    """
    if not transcript:
        return _fallback_mood(transcript)
    prompt = (
        "Read this voice check-in from a fitness app user and judge their mood "
        "(one or two lowercase words) and energy level from 1 (exhausted) to 10 "
        f"(very energetic).\n\nTranscript: {transcript}"
    )
    try:
        result = await ai_client.generate_json(prompt, _MoodResult, temperature=0.2, user_id=user_id)
    except AIError as e:
        logger.warning("Mood analysis unavailable: %s", e)
        return _fallback_mood(transcript)
    return result.mood.strip().lower(), result.energy_level


async def process_voice(
    audio_blob: bytes,
    user_id: str,
    filename: str = "audio.webm",
    content_type: str = "audio/webm",
) -> VoiceCheckin:
    """Full voice check-in pipeline: store audio, transcribe, analyse, persist."""
    audio_url = await cloud_service.upload_to_r2(
        audio_blob, user_id, content_type=content_type
    )
    transcript = await transcribe_audio(audio_blob, user_id, filename=filename)
    mood, energy_level = await analyze_mood_from_transcript(transcript, user_id)

    checkin = VoiceCheckin(
        user_id=user_id,
        transcript=transcript,
        mood=mood,
        energy_level=energy_level,
        audio_url=audio_url,
    )
    await checkin.save()
    logger.info("Processed voice check-in for user %s: mood=%s energy=%s", user_id, mood, energy_level)
    return checkin


async def get_voice_history(user_id: str, limit: int = 30):
    """Return the user's voice check-in history, newest first."""
    return await VoiceCheckin.get_history(user_id, limit=limit)
