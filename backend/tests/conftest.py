"""Shared test setup.

Tests never touch a real database or AI provider:
- settings are forced to a test environment with no API keys (overriding any
  values in .env.local),
- each test gets a fresh in-process mock MongoDB,
- AI providers are replaced per test via the ``ai_providers`` fixture.
"""
import os

# Must run before the app (and its cached settings) is imported.
os.environ.update(
    {
        "DATABASE_ENV": "test",
        "GEMINI_API_KEY": "",
        "GROQ_API_KEY": "",
        "CLOUDFLARE_R2_URL": "",
        "JWT_SECRET": "test-secret-key-that-is-long-enough-1234567890",
        "RATE_LIMIT_MAX_REQUESTS": "100000",
        "AI_DAILY_QUOTA": "150",
    }
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

from app.ai import client as ai_client  # noqa: E402
from app.config import database  # noqa: E402
from app.config.settings import get_settings  # noqa: E402
from app.main import app  # noqa: E402

get_settings.cache_clear()


@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """Give every test its own empty mock MongoDB."""
    db = AsyncMongoMockClient(tz_aware=True)["fitmind_test"]
    monkeypatch.setattr(database, "db", db)
    return db


@pytest.fixture
def client():
    """HTTP client for the app. Startup hooks (DB connect, scheduler) don't run."""
    return TestClient(app)


class FakeProviders:
    """Scripted stand-ins for the AI providers.

    Queue responses with ``gemini``/``groq`` lists; each call pops the next
    item. A string is returned as the model's text; an Exception is raised.
    Every prompt received is recorded in ``calls``.
    """

    def __init__(self):
        self.gemini = []
        self.groq = []
        self.calls = []

    def _make(self, name):
        async def provider(prompt, system, temperature, json_mode):
            self.calls.append({"provider": name, "prompt": prompt, "system": system})
            queue = getattr(self, name)
            if not queue:
                raise ai_client.AIError(f"{name} not configured in test")
            item = queue.pop(0)
            if isinstance(item, Exception):
                raise item
            return item

        return provider


@pytest.fixture
def ai_providers(monkeypatch):
    """Replace Gemini and Groq with scripted fakes (both fail by default)."""
    fake = FakeProviders()
    monkeypatch.setitem(ai_client._PROVIDERS, ai_client.PROVIDER_GEMINI, fake._make("gemini"))
    monkeypatch.setitem(ai_client._PROVIDERS, ai_client.PROVIDER_GROQ, fake._make("groq"))
    return fake


def register_and_login(client, email="user@example.com", password="password123", timezone=None):
    """Create an account and return (auth headers, user id)."""
    client.post("/api/v1/auth/register", json={"email": email, "password": password})
    token = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    ).json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}
    if timezone:
        headers["X-Timezone"] = timezone
    user_id = client.get("/api/v1/auth/me", headers=headers).json()["data"]["id"]
    return headers, user_id


ONBOARDING = {
    "age": 28,
    "gender": "male",
    "weight_kg": 70,
    "height_cm": 175,
    "fitness_goal": "build_muscle",
    "experience_level": "intermediate",
    "available_equipment": ["dumbbells"],
    "injuries": [],
}
