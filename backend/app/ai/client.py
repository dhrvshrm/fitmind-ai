"""Single entry point for every AI call in the app.

Callers ask for text or for a validated Pydantic object and don't care which
provider answers. Each call:

- counts against the user's daily quota (when a ``user_id`` is given),
- tries Gemini first and falls back to Groq if Gemini fails,
- is bounded by ``AI_TIMEOUT_SECONDS``,
- for structured output, is validated against a Pydantic model and retried
  once with the validation error before giving up.

Every provider failure surfaces as :class:`AIError`, so callers can fall back
to deterministic behaviour.
"""
import asyncio
import json
import logging
import re
from datetime import timedelta
from typing import AsyncIterator, Dict, List, Optional, Sequence, Type, TypeVar

from pydantic import BaseModel, ValidationError

from app.ai import cache, quota
from app.ai.quota import AIQuotaExceeded
from app.config.settings import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

PROVIDER_GEMINI = "gemini"
PROVIDER_GROQ = "groq"
DEFAULT_PROVIDERS = (PROVIDER_GEMINI, PROVIDER_GROQ)


class AIError(Exception):
    """Raised when no provider could produce a usable response."""


class AIQuotaError(AIError):
    """Raised when the user has used up today's AI calls."""


# ---------------------------------------------------------------------------
# Providers
# ---------------------------------------------------------------------------
async def _gemini(prompt: str, system: Optional[str], temperature: float, json_mode: bool) -> str:
    """Call Gemini asynchronously and return the response text."""
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise AIError("GEMINI_API_KEY is not configured")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    config = types.GenerateContentConfig(temperature=temperature, system_instruction=system)
    if json_mode:
        config.response_mime_type = "application/json"
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL, contents=prompt, config=config
    )
    return response.text or ""


async def _groq(prompt: str, system: Optional[str], temperature: float, json_mode: bool) -> str:
    """Call Groq's chat completions API and return the response text."""
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        raise AIError("GROQ_API_KEY is not configured")
    from groq import AsyncGroq

    messages: List[Dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    kwargs = {"response_format": {"type": "json_object"}} if json_mode else {}
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    response = await client.chat.completions.create(
        model=settings.GROQ_JSON_MODEL if json_mode else settings.GROQ_CHAT_MODEL,
        messages=messages,
        temperature=temperature,
        **kwargs,
    )
    return response.choices[0].message.content or ""


_PROVIDERS = {PROVIDER_GEMINI: _gemini, PROVIDER_GROQ: _groq}


async def _call_providers(
    prompt: str,
    system: Optional[str],
    temperature: float,
    json_mode: bool,
    providers: Sequence[str],
) -> str:
    """Try each provider in order and return the first non-empty response."""
    timeout = get_settings().AI_TIMEOUT_SECONDS
    errors: List[str] = []
    for name in providers:
        try:
            text = await asyncio.wait_for(
                _PROVIDERS[name](prompt, system, temperature, json_mode), timeout
            )
        except Exception as e:  # Any provider failure moves on to the next one.
            errors.append(f"{name}: {e or type(e).__name__}")
            continue
        if text.strip():
            return text
        errors.append(f"{name}: empty response")
    logger.warning("All AI providers failed: %s", "; ".join(errors))
    raise AIError("; ".join(errors) or "no AI provider available")


async def _charge(user_id: Optional[str]) -> None:
    """Count the call against the user's daily quota."""
    if user_id is None:
        return
    try:
        await quota.consume(user_id)
    except AIQuotaExceeded as e:
        raise AIQuotaError(str(e)) from e


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def generate_text(
    prompt: str,
    *,
    system: Optional[str] = None,
    temperature: float = 0.7,
    user_id: Optional[str] = None,
    providers: Sequence[str] = DEFAULT_PROVIDERS,
) -> str:
    """Generate free text.

    Raises:
        AIError: if the quota is used up or every provider fails.
    """
    await _charge(user_id)
    return (await _call_providers(prompt, system, temperature, False, providers)).strip()


def _extract_json(raw: str) -> object:
    """Parse JSON from a model response, tolerating code fences or stray text."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}|\[.*\]", raw, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def _schema_instructions(schema: Type[BaseModel]) -> str:
    """Describe the required JSON shape so any provider can follow it."""
    return (
        "\n\nRespond with ONLY a JSON object that matches this JSON Schema. "
        "No prose, no code fences.\n"
        f"{json.dumps(schema.model_json_schema(), separators=(',', ':'))}"
    )


async def generate_json(
    prompt: str,
    schema: Type[T],
    *,
    system: Optional[str] = None,
    temperature: float = 0.3,
    user_id: Optional[str] = None,
    cache_key: Optional[str] = None,
    cache_ttl: timedelta = cache.DEFAULT_TTL,
    providers: Sequence[str] = DEFAULT_PROVIDERS,
    retries: int = 1,
) -> T:
    """Generate a structured response validated against ``schema``.

    If the model returns invalid JSON or data that fails validation, the
    request is retried with the error included so the model can correct it.
    Successful results are cached when ``cache_key`` is given (only use that
    for inputs that contain no personal data).

    Raises:
        AIError: if the quota is used up, every provider fails, or the output
            is still invalid after ``retries`` corrections.
    """
    if cache_key:
        cached = await cache.get(cache_key)
        if cached is not None:
            try:
                return schema.model_validate(cached)
            except ValidationError:
                logger.info("Ignoring stale cache entry %s", cache_key)

    await _charge(user_id)
    full_prompt = prompt + _schema_instructions(schema)
    last_error = ""
    for attempt in range(retries + 1):
        attempt_prompt = full_prompt
        if last_error:
            attempt_prompt += (
                f"\n\nYour previous answer was invalid ({last_error}). "
                "Return corrected JSON only."
            )
        raw = await _call_providers(attempt_prompt, system, temperature, True, providers)
        try:
            result = schema.model_validate(_extract_json(raw))
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = str(e).splitlines()[0][:300]
            logger.info("AI JSON attempt %d invalid: %s", attempt + 1, last_error)
            continue
        if cache_key:
            await cache.put(cache_key, result.model_dump(mode="json"), cache_ttl)
        return result
    raise AIError(f"invalid structured output after {retries + 1} attempts: {last_error}")


async def stream_chat(
    messages: List[Dict[str, str]],
    *,
    user_id: Optional[str] = None,
) -> AsyncIterator[str]:
    """Stream a chat completion from Groq, token by token.

    Raises:
        AIError: if the quota is used up or Groq is unavailable. Errors after
            streaming has started are raised as AIError too.
    """
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        raise AIError("GROQ_API_KEY is not configured")
    await _charge(user_id)
    from groq import AsyncGroq

    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        stream = await asyncio.wait_for(
            client.chat.completions.create(
                model=settings.GROQ_CHAT_MODEL, messages=messages, stream=True
            ),
            settings.AI_TIMEOUT_SECONDS,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except AIError:
        raise
    except Exception as e:
        raise AIError(f"chat stream failed: {e}") from e


async def transcribe(audio_bytes: bytes, filename: str, *, user_id: Optional[str] = None) -> str:
    """Transcribe audio with Groq Whisper.

    Raises:
        AIError: if the quota is used up, Groq isn't configured, or the call fails.
    """
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        raise AIError("GROQ_API_KEY is not configured")
    await _charge(user_id)
    from groq import AsyncGroq

    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        result = await asyncio.wait_for(
            client.audio.transcriptions.create(
                file=(filename, audio_bytes), model=settings.GROQ_WHISPER_MODEL
            ),
            settings.AI_TIMEOUT_SECONDS,
        )
    except Exception as e:
        raise AIError(f"transcription failed: {e}") from e
    return (result.text or "").strip()
