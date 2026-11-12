"""Phase 11: daily steps, step target, activity estimate, desk routines, break reminders."""
import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from app.activity import breaks, desk_routines
from app.activity import steps as step_rules
from app.models.user import User
from app.services import activity_service, privacy_service
from app.utils.time import local_today
from app.workouts import catalog
from tests.conftest import ONBOARDING, register_and_login

TZ = "Asia/Kolkata"


def _onboard(client, headers, **overrides):
    payload = {**ONBOARDING, "activity_level": "light", "fitness_goal": "fat_loss", **overrides}
    response = client.post("/api/v1/users/onboarding", json=payload, headers=headers)
    assert response.status_code == 200, response.text


def _log_days(client, headers, counts):
    today = local_today(TZ)
    for offset, steps in enumerate(counts):
        day = (today - timedelta(days=offset)).isoformat()
        response = client.put(f"/api/v1/activity/steps/{day}", json={"steps": steps}, headers=headers)
        assert response.status_code == 200, response.text


# --- Pure rules -------------------------------------------------------------------
@pytest.mark.parametrize("average,band", [
    (0, "sedentary"), (4999, "sedentary"), (5000, "light"), (7499, "light"), (7500, "moderate"),
    (9999, "moderate"), (10000, "active"), (12499, "active"), (12500, "very_active"),
])
def test_step_bands(average, band):
    assert step_rules.band_for_steps(average) == band


def test_derive_level_needs_seven_days():
    assert step_rules.derive_level([12000] * 6, "sedentary", None) is None
    assert step_rules.derive_level([12000] * 7, "sedentary", None) == "light"


def test_derive_level_moves_at_most_one_band():
    # 13k steps a day would be very_active, but a self-reported sedentary person moves one band.
    assert step_rules.derive_level([13000] * 10, "sedentary", None) == "light"
    # And never more than one band from what was used last time.
    assert step_rules.derive_level([1000] * 10, "active", "very_active") == "active"


def test_effective_level_stays_within_one_band_of_self_report():
    assert step_rules.effective_level("moderate", None) == "moderate"
    assert step_rules.effective_level("sedentary", "very_active") == "light"
    assert step_rules.effective_level(None, "active") == "active"


def test_default_step_target():
    assert step_rules.default_step_target("sedentary", "maintain", 30) == 6000
    assert step_rules.default_step_target("light", "fat_loss", 30) == 8000
    assert step_rules.default_step_target("very_active", "fat_loss", 30) == 10000
    assert step_rules.default_step_target("active", "fat_loss", 65) == 8000


# --- Steps endpoints ----------------------------------------------------------------
def test_log_edit_and_list_steps(client):
    headers, _ = register_and_login(client, timezone=TZ)
    _onboard(client, headers)
    today = local_today(TZ).isoformat()

    assert client.put(f"/api/v1/activity/steps/{today}", json={"steps": 4000}, headers=headers).status_code == 200
    # Same day again replaces the value: one entry per local date.
    response = client.put(f"/api/v1/activity/steps/{today}", json={"steps": 6500}, headers=headers)
    summary = response.json()["data"]["summary"]
    assert summary["today_steps"] == 6500
    assert len(summary["days"]) == 14
    assert summary["days"][-1] == {"date": today, "steps": 6500}
    assert summary["target"] == 8000  # light + fat loss
    assert summary["target_is_default"] is True
    assert summary["activity"]["source"] == "self_reported"

    response = client.delete(f"/api/v1/activity/steps/{today}", headers=headers)
    assert response.json()["data"]["summary"]["today_steps"] is None
    assert client.delete(f"/api/v1/activity/steps/{today}", headers=headers).status_code == 404


def test_steps_date_limits(client):
    headers, _ = register_and_login(client, timezone=TZ)
    tomorrow = (local_today(TZ) + timedelta(days=1)).isoformat()
    too_old = (local_today(TZ) - timedelta(days=31)).isoformat()
    assert client.put(f"/api/v1/activity/steps/{tomorrow}", json={"steps": 10}, headers=headers).status_code == 400
    assert client.put(f"/api/v1/activity/steps/{too_old}", json={"steps": 10}, headers=headers).status_code == 400
    today = local_today(TZ).isoformat()
    assert client.put(f"/api/v1/activity/steps/{today}", json={"steps": -1}, headers=headers).status_code == 422


def test_steps_feed_targets_after_seven_days(client):
    headers, _ = register_and_login(client, timezone=TZ)
    _onboard(client, headers)
    before = client.get("/api/v1/users/targets", headers=headers).json()["data"]["targets"]

    _log_days(client, headers, [11000] * 6)
    six = client.get("/api/v1/activity/steps", headers=headers).json()["data"]["activity"]
    assert six["source"] == "self_reported" and six["recent_days_logged"] == 6

    _log_days(client, headers, [11000] * 7)
    activity = client.get("/api/v1/activity/steps", headers=headers).json()["data"]["activity"]
    # 11k a day is "active", but a self-reported "light" moves only one band.
    assert activity["source"] == "steps"
    assert activity["effective"] == "moderate"

    after = client.get("/api/v1/users/targets", headers=headers).json()["data"]["targets"]
    assert after["tdee"] > before["tdee"]
    note = next(n for n in after["notes"] if n["code"] == "activity")
    assert note["values"]["level"] == "moderate"


def test_calorie_floor_still_applies_with_steps(client):
    headers, _ = register_and_login(client, timezone=TZ)
    _onboard(client, headers, gender="female", weight_kg=45, height_cm=150, age=55, activity_level="sedentary",
             goal_pace="aggressive")
    _log_days(client, headers, [100] * 10)
    targets = client.get("/api/v1/users/targets", headers=headers).json()["data"]["targets"]
    assert targets["calories"] >= 1200


def test_step_target_setting(client):
    headers, _ = register_and_login(client, timezone=TZ)
    _onboard(client, headers)
    response = client.put("/api/v1/activity/settings", json={"step_target": 9000}, headers=headers)
    assert response.json()["data"]["effective_step_target"] == 9000
    assert client.get("/api/v1/activity/steps", headers=headers).json()["data"]["target"] == 9000
    response = client.put("/api/v1/activity/settings", json={"reset_step_target": True}, headers=headers)
    assert response.json()["data"]["effective_step_target"] == 8000
    assert client.put("/api/v1/activity/settings", json={"step_target": 10}, headers=headers).status_code == 422


# --- Desk routines --------------------------------------------------------------------
def test_desk_routines_use_catalogue_exercises(client):
    headers, _ = register_and_login(client, timezone=TZ)
    routines = client.get("/api/v1/activity/desk-routines", headers=headers).json()["data"]["routines"]
    assert {r["minutes"] for r in routines} == {2, 5, 10}
    for routine in routines:
        assert routine["steps"]
        # Each routine fits its label (within a minute).
        assert abs(routine["total_seconds"] - routine["minutes"] * 60) <= 60
        for step in routine["steps"]:
            exercise = catalog.get(step["exercise_id"])
            assert exercise is not None and exercise.curated
            assert step["image"]
    assert client.get("/api/v1/activity/desk-routines/nope", headers=headers).status_code == 404


def test_desk_routines_skip_injured_joints():
    routine = desk_routines.get_routine("wrists_forearms", ["wrist pain"])
    assert routine["skipped_for_injury"] == 1
    assert all("wrist" not in s["joints"] for s in routine["steps"])


# --- Break reminders -------------------------------------------------------------------
def _ist(hour, minute, day=12):
    # 2026-11-12 is a Thursday.
    return datetime(2026, 11, day, hour, minute, tzinfo=timezone(timedelta(hours=5, minutes=30)))


def test_latest_slot():
    workdays = [0, 1, 2, 3, 4]
    assert breaks.latest_slot(_ist(9, 30), TZ, "09:00", "18:00", 60, workdays) is None
    assert breaks.latest_slot(_ist(10, 5), TZ, "09:00", "18:00", 60, workdays).strftime("%H:%M") == "10:00"
    assert breaks.latest_slot(_ist(18, 5), TZ, "09:00", "18:00", 60, workdays) is None
    # Saturday is off.
    assert breaks.latest_slot(_ist(11, 0, day=14), TZ, "09:00", "18:00", 60, workdays) is None
    # Night shift crossing midnight, started Thursday.
    slot = breaks.latest_slot(_ist(1, 10, day=13), TZ, "22:00", "06:00", 90, workdays)
    assert slot.strftime("%H:%M") == "01:00"


async def _user_with_settings(**settings):
    user = await User(email="b@example.com", password_hash="x", timezone_name=TZ).save()
    await activity_service.update_settings(user, settings)
    return user


@pytest.mark.asyncio
async def test_due_break_reminders_and_dedupe():
    user = await _user_with_settings(break_reminders_enabled=True, break_interval_minutes=60)
    due = await activity_service.due_break_reminders(user, _ist(11, 3))
    assert len(due) == 1
    reminder = due[0]
    assert reminder["key"] == "break:2026-11-12:11:00"
    assert reminder["routine_id"] in desk_routines.ROUTINE_IDS
    # Too late to send: the 11:00 slot is skipped at 11:30.
    assert await activity_service.due_break_reminders(user, _ist(11, 30)) == []
    await activity_service.mark_break_reminder_sent(user.id, reminder["key"])
    assert await activity_service.due_break_reminders(user, _ist(11, 10)) == []
    # Dict users work too (the push sender may pass raw documents).
    assert await activity_service.due_break_reminders({"id": user.id, "timezone": TZ}, _ist(12, 1))


@pytest.mark.asyncio
async def test_break_reminders_off_by_default():
    user = await _user_with_settings()
    assert await activity_service.due_break_reminders(user, _ist(11, 3)) == []


def test_activity_collections_deleted_with_account():
    assert "step_logs" in privacy_service.USER_DATA_COLLECTIONS
    assert "activity_settings" in privacy_service.USER_DATA_COLLECTIONS


def test_account_deletion_removes_steps(client, mock_db):
    headers, user_id = register_and_login(client, timezone=TZ)
    _log_days(client, headers, [5000])
    client.put("/api/v1/activity/settings", json={"break_reminders_enabled": True}, headers=headers)

    async def count():
        return (await mock_db["step_logs"].count_documents({"user_id": user_id}),
                await mock_db["activity_settings"].count_documents({"user_id": user_id}))

    assert asyncio.run(count()) == (1, 1)
    assert client.delete("/api/v1/settings/account", headers=headers).status_code == 200
    assert asyncio.run(count()) == (0, 0)
