import json
import logging
import re
from typing import Tuple

from app.config.settings import get_settings
from app.models.voice_checkin import VoiceCheckin
from app.services import cloud_service

logger = logging.getLogger(__name__)

# Neutral defaults used when transcription or mood analysis is unavailable.
DEFAULT_MOOD = "neutral"
DEFAULT_ENERGY = 5

# Lightweight keyword heuristic for the no-Gemini fallback.
_POSITIVE_WORDS = {"good", "great", "happy", "energised", "energized", "strong", "motivated", "excited", "amazing", "refreshed"}
_NEGATIVE_WORDS = {"tired", "exhausted", "sore", "stressed", "bad", "low", "sad", "drained", "sick", "anxious", "weak"}


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio using Groq Whisper.

    Returns an empty string when Groq is not configured/installed or the
    call fails, so the check-in flow can continue without transcription.
    """
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        logger.info("GROQ_API_KEY not set — skipping transcription")
        return ""
    try:
        from groq import Groq

        client = Groq(api_key=settings.GROQ_API_KEY)
        result = client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model=settings.GROQ_WHISPER_MODEL,
        )
        return (result.text or "").strip()
    except Exception as e:
        logger.warning("Groq transcription failed: %s", e)
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


def analyze_mood_from_transcript(transcript: str) -> Tuple[str, int]:
    """Analyse a transcript for mood and energy (1-10) using Gemini.

    Falls back to a keyword heuristic when Gemini is not configured or the
    response can't be parsed. Always returns ``(mood, energy_level)`` with
    energy clamped to ``[1, 10]``.
    """
    settings = get_settings()
    if not settings.GEMINI_API_KEY or not transcript:
        return _fallback_mood(transcript)

    prompt = (
        "Analyze this voice check-in transcript from a fitness app user and "
        "determine their mood and energy level. Respond with ONLY a JSON object "
        'of the form {"mood": "<one or two words>", "energy_level": <integer 1-10>}. '
        f"Transcript: {transcript}"
    )
    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
        return _parse_mood_response(response.text)
    except Exception as e:
        logger.warning("Gemini mood analysis failed: %s", e)
        return _fallback_mood(transcript)


def _parse_mood_response(text: str) -> Tuple[str, int]:
    """Extract (mood, energy_level) from Gemini's JSON-ish response."""
    match = re.search(r"\{.*\}", text or "", re.DOTALL)
    if not match:
        raise ValueError("no JSON object in model response")
    data = json.loads(match.group(0))
    mood = str(data.get("mood", DEFAULT_MOOD)).strip() or DEFAULT_MOOD
    energy = int(data.get("energy_level", DEFAULT_ENERGY))
    energy = max(1, min(10, energy))
    return mood, energy


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
    transcript = transcribe_audio(audio_blob, filename=filename)
    mood, energy_level = analyze_mood_from_transcript(transcript)

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
