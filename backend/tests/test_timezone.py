from datetime import datetime, timezone

import pytest

from app.utils import time as time_utils
from tests.conftest import register_and_login

API = "/api/v1"
MEAL = {"name": "Vada Pav", "calories": 300, "protein": 7, "carbs": 40, "fats": 13}

# 2026-11-02 20:00 UTC is already 2026-11-03 01:30 in India.
FIXED_UTC = datetime(2026, 11, 2, 20, 0, tzinfo=timezone.utc)


@pytest.fixture
def frozen_now(monkeypatch):
    """Freeze the clock used for user-local dates at FIXED_UTC."""

    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return FIXED_UTC if tz else FIXED_UTC.replace(tzinfo=None)

    monkeypatch.setattr(time_utils, "datetime", FrozenDateTime)


def test_local_today_depends_on_timezone(frozen_now):
    assert time_utils.local_today_iso("Asia/Kolkata") == "2026-11-03"
    assert time_utils.local_today_iso("UTC") == "2026-11-02"
    assert time_utils.local_today_iso("America/Los_Angeles") == "2026-11-02"


def test_meal_logged_after_midnight_ist_lands_on_the_ist_day(client, frozen_now):
    headers, _ = register_and_login(client, timezone="Asia/Kolkata")
    meal = client.post(f"{API}/nutrition/meal", headers=headers, json=MEAL).json()["data"]["meal"]
    assert meal["date"] == "2026-11-03"
    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    assert today["date"] == "2026-11-03"
    assert today["meals_logged"] == 1


def test_browser_timezone_header_is_saved_to_the_profile(client):
    headers, _ = register_and_login(client, timezone="Europe/London")
    profile = client.get(f"{API}/users/profile", headers=headers).json()["data"]
    assert profile["timezone"] == "Europe/London"


def test_invalid_timezone_header_is_ignored(client):
    headers, _ = register_and_login(client, timezone="Not/AZone")
    profile = client.get(f"{API}/users/profile", headers=headers).json()["data"]
    assert profile["timezone"] == time_utils.DEFAULT_TIMEZONE


def test_new_users_default_to_india_time(client):
    headers, _ = register_and_login(client)
    profile = client.get(f"{API}/users/profile", headers=headers).json()["data"]
    assert profile["timezone"] == "Asia/Kolkata"
