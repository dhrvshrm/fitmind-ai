import asyncio
from datetime import datetime, timezone

import pytest

from app.background_jobs import jobs
from app.models.notification import Notification
from app.models.workout import WorkoutLog
from app.utils import time as time_utils
from tests.conftest import register_and_login

# 14:30 UTC is 20:00 in India (the streak-warning hour) and 09:30 in New York.
FIXED_UTC = datetime(2026, 11, 3, 14, 30, tzinfo=timezone.utc)


@pytest.fixture
def frozen_now(monkeypatch):
    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return FIXED_UTC if tz else FIXED_UTC.replace(tzinfo=None)

    monkeypatch.setattr(time_utils, "datetime", FrozenDateTime)


async def _log_workout(user_id, day):
    await WorkoutLog(user_id=user_id, exercises=[], duration_minutes=30, intensity="medium",
                     xp_earned=0, log_date=day).save()


async def _streak_notifications(user_id):
    notes = await Notification.get_for_user(user_id, limit=50)
    return [n for n in notes if n.type == "streak_warning"]


def test_streak_warning_uses_each_users_local_evening(client, frozen_now):
    _, india_id = register_and_login(client, "india@example.com", timezone="Asia/Kolkata")
    _, ny_id = register_and_login(client, "ny@example.com", timezone="America/New_York")

    async def scenario():
        for user_id in (india_id, ny_id):
            await _log_workout(user_id, "2026-11-01")
            await _log_workout(user_id, "2026-11-02")
        await jobs.streak_warning_job()
        return await _streak_notifications(india_id), await _streak_notifications(ny_id)

    india, ny = asyncio.run(scenario())
    assert len(india) == 1
    assert "2-day streak" in india[0].message
    assert ny == []  # 9:30 AM in New York; not their evening yet.


def test_no_warning_once_the_user_has_worked_out_today(client, frozen_now):
    _, user_id = register_and_login(client, timezone="Asia/Kolkata")

    async def scenario():
        await _log_workout(user_id, "2026-11-02")
        await _log_workout(user_id, "2026-11-03")
        await jobs.streak_warning_job()
        return await _streak_notifications(user_id)

    assert asyncio.run(scenario()) == []


def test_no_warning_without_a_streak(client, frozen_now):
    _, user_id = register_and_login(client, timezone="Asia/Kolkata")
    asyncio.run(jobs.streak_warning_job())
    assert asyncio.run(_streak_notifications(user_id)) == []
