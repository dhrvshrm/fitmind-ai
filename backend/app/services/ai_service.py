import logging

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    """Raised when the AI provider is unavailable or a generation fails."""


def generate_text(prompt: str, temperature: float = 0.7, json_mode: bool = False) -> str:
    """Generate text from a prompt using the Gemini API.

    Args:
        prompt: The prompt to send to the model.
        temperature: Sampling temperature (higher = more creative).
        json_mode: When True, ask the model to return valid JSON.

    Returns:
        The model's text response.

    Raises:
        AIServiceError: if Gemini is not configured, not installed, or the
            request fails. Callers should handle this and degrade gracefully.
    """
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise AIServiceError("GEMINI_API_KEY is not configured")

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        config = types.GenerateContentConfig(temperature=temperature)
        if json_mode:
            config.response_mime_type = "application/json"

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=config,
        )
        text = response.text or ""
        if not text.strip():
            raise AIServiceError("Gemini returned an empty response")
        return text
    except AIServiceError:
        raise
    except Exception as e:
        logger.warning("Gemini generation failed: %s", e)
        raise AIServiceError(str(e)) from e
