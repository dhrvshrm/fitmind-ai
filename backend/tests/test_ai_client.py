import asyncio
import json

import pytest
from pydantic import BaseModel, Field

from app.ai import client as ai_client
from app.ai.style import STYLE_GUIDE, find_style_violations
from app.config.settings import get_settings


class Food(BaseModel):
    name: str
    calories: float = Field(..., ge=0)


def run(coro):
    return asyncio.run(coro)


def test_valid_json_is_parsed_into_the_schema(ai_providers):
    ai_providers.gemini = ['{"name": "Poha", "calories": 250}']
    result = run(ai_client.generate_json("poha", Food))
    assert result == Food(name="Poha", calories=250)


def test_json_wrapped_in_prose_or_fences_is_still_parsed(ai_providers):
    ai_providers.gemini = ['Here you go:\n```json\n{"name": "Idli", "calories": 60}\n```']
    assert run(ai_client.generate_json("idli", Food)).name == "Idli"


def test_invalid_output_is_retried_with_the_error(ai_providers):
    ai_providers.gemini = ['{"name": "Dosa", "calories": -10}', '{"name": "Dosa", "calories": 170}']
    result = run(ai_client.generate_json("dosa", Food))
    assert result.calories == 170
    assert "previous answer was invalid" in ai_providers.calls[1]["prompt"]


def test_falls_back_to_groq_when_gemini_fails(ai_providers):
    ai_providers.gemini = [RuntimeError("gemini down")]
    ai_providers.groq = ['{"name": "Upma", "calories": 200}']
    assert run(ai_client.generate_json("upma", Food)).name == "Upma"
    assert [c["provider"] for c in ai_providers.calls] == ["gemini", "groq"]


def test_raises_ai_error_when_every_provider_fails(ai_providers):
    with pytest.raises(ai_client.AIError):
        run(ai_client.generate_json("anything", Food))


def test_raises_after_retries_are_exhausted(ai_providers):
    ai_providers.gemini = ["not json", "still not json"]
    with pytest.raises(ai_client.AIError):
        run(ai_client.generate_json("x", Food, retries=1))


def test_schema_is_included_in_the_prompt(ai_providers):
    ai_providers.gemini = ['{"name": "Rice", "calories": 130}']
    run(ai_client.generate_json("rice", Food))
    prompt = ai_providers.calls[0]["prompt"]
    assert json.dumps(Food.model_json_schema(), separators=(",", ":")) in prompt


def test_cache_hit_skips_the_provider(ai_providers):
    ai_providers.gemini = ['{"name": "Roti", "calories": 120}']
    key = "test:roti"
    first = run(ai_client.generate_json("roti", Food, cache_key=key))
    second = run(ai_client.generate_json("roti", Food, cache_key=key))
    assert first == second
    assert len(ai_providers.calls) == 1


def test_daily_quota_blocks_further_calls(ai_providers, monkeypatch):
    monkeypatch.setattr(get_settings(), "AI_DAILY_QUOTA", 2)
    ai_providers.gemini = ["one", "two", "three"]
    run(ai_client.generate_text("a", user_id="u1"))
    run(ai_client.generate_text("b", user_id="u1"))
    with pytest.raises(ai_client.AIQuotaError):
        run(ai_client.generate_text("c", user_id="u1"))
    # Other users are unaffected.
    assert run(ai_client.generate_text("d", user_id="u2")) == "three"


def test_slow_provider_times_out_and_falls_back(ai_providers, monkeypatch):
    monkeypatch.setattr(get_settings(), "AI_TIMEOUT_SECONDS", 0.05)

    async def slow(*_args):
        await asyncio.sleep(1)
        return "too late"

    monkeypatch.setitem(ai_client._PROVIDERS, ai_client.PROVIDER_GEMINI, slow)
    ai_providers.groq = ["fast answer"]
    assert run(ai_client.generate_text("q")) == "fast answer"


def test_style_checker_flags_hype_emojis_and_dashes():
    bad = "Great question! You've got this \U0001F4AA — keep it up!"
    violations = find_style_violations(bad)
    assert any("great question" in v for v in violations)
    assert "emoji" in violations
    assert "em/en dash" in violations
    good = "You can replace today's gym session with a home workout for the same muscles."
    assert find_style_violations(good) == []


def test_style_guide_itself_follows_its_own_dash_rule():
    assert "—" not in STYLE_GUIDE and "–" not in STYLE_GUIDE
