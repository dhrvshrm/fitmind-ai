"""Phase 7, the daily habit loop: analytics, instant setup, reminders and the easy restart."""
import asyncio
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.config.settings import get_settings
from app.models import analytics, diet_plan
from app.models import push as push_store
from app.models.nutrition import Meal
from app.models.user import User
from app.services import (
    analytics_service,
    diet_plan_service,
    habit_service,
    privacy_service,
    push_service,
    reminder_service,
    setup_service,
)
from app.utils.time import local_today, use_timezone
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"
SUBSCRIPTION = {
    "endpoint": "https://push.example.com/send/abc123",
    "keys": {"p256dh": "BPublicKeyFromTheBrowser", "auth": "authsecret"},
}


def _events(name=None, user_id=None):
    return asyncio.run(analytics.find([name] if name else None, user_id=user_id))


@pytest.fixture
def push_on(monkeypatch):
    """Configure VAPID keys and capture pushes instead of sending them."""
    settings = get_settings()
    monkeypatch.setattr(settings, "VAPID_PUBLIC_KEY", "BTestPublicKey")
    monkeypatch.setattr(settings, "VAPID_PRIVATE_KEY", "test-private-key")
    monkeypatch.setattr(settings, "VAPID_SUBJECT", "mailto:team@example.com")
    sent = []
    monkeypatch.setattr(push_service, "_send_one", lambda sub, payload: sent.append((sub["endpoint"], payload)))
    return sent


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
def test_signup_onboarding_and_logging_are_tracked_server_side(client):
    headers, user_id = register_and_login(client)
    client.post(f"{API}/users/onboarding?setup=true", headers=headers, json=ONBOARDING)
    client.post(f"{API}/nutrition/meal", headers=headers, json={"name": "Poha", "calories": 250})
    client.post(f"{API}/nutrition/water", headers=headers, json={"amount_ml": 250})
    client.post(f"{API}/workouts/log", headers=headers, json={"duration_minutes": 20})

    names = {e["event"] for e in _events(user_id=user_id)}
    assert {
        "signed_up", "onboarding_completed", "meal_plan_created", "workout_plan_created",
        "meal_logged", "water_logged", "workout_logged",
    } <= names


def test_events_never_carry_health_values(client):
    headers, user_id = register_and_login(client)
    client.post(f"{API}/nutrition/meal", headers=headers, json={"name": "Poha", "calories": 250, "protein": 6})
    meal_event = _events("meal_logged", user_id)[0]
    assert set(meal_event["properties"]) <= analytics_service.ALLOWED_PROPERTIES
    assert "Poha" not in str(meal_event) and "250" not in str(meal_event["properties"])


def test_unknown_events_are_ignored_and_properties_are_filtered():
    assert asyncio.run(analytics_service.track("u1", "weight_logged_85kg")) is False
    cleaned = analytics_service.clean_properties(
        {"screen": "today", "weight_kg": 82, "standalone": True, "email": "a@b.c", "minutes": 99999}
    )
    assert cleaned == {"screen": "today", "standalone": True}


def test_client_event_endpoint_only_accepts_client_events(client):
    headers, user_id = register_and_login(client)
    ok = client.post(f"{API}/analytics/events", headers=headers,
                     json={"event": "app_opened", "properties": {"standalone": True, "name": "Asha"}})
    assert ok.status_code == 202
    assert _events("app_opened", user_id)[0]["properties"] == {"standalone": True}
    # Server-only and made-up events are refused.
    for event in ("meal_logged", "anything_else"):
        res = client.post(f"{API}/analytics/events", headers=headers, json={"event": event})
        assert res.status_code == 400
    assert client.post(f"{API}/analytics/events", json={"event": "app_opened"}).status_code in (401, 403)


def test_a_failing_event_store_never_breaks_the_request(client, monkeypatch):
    async def broken(*args, **kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(analytics, "insert", broken)
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/nutrition/meal", headers=headers, json={"name": "Poha", "calories": 250})
    assert res.status_code == 200


def test_metrics_compute_activation_retention_and_weekly_loggers():
    today = date(2026, 11, 20)

    def ev(user, name, day):
        return {"user_id": user, "event": name, "local_date": day.isoformat()}

    d0 = today - timedelta(days=10)
    events = [
        ev("a", "signed_up", d0), ev("a", "meal_logged", d0), ev("a", "meal_logged", d0 + timedelta(days=6)),
        ev("b", "signed_up", d0), ev("b", "meal_logged", d0 + timedelta(days=1)),
        ev("c", "signed_up", today - timedelta(days=2)), ev("c", "meal_logged", today - timedelta(days=2)),
        ev("d", "workout_logged", today),
    ]
    m = analytics_service.compute_metrics(events, today)
    assert m["new_users"] == 3
    assert m["day1_meal_loggers"] == 2 and m["day1_activation"] == pytest.approx(0.667)
    # Only a and b have finished their seventh day; a logged on it.
    assert m["day7_eligible"] == 2 and m["day7_retention"] == 0.5
    # a (meal, 4 days ago), c (meal, 2 days ago) and d (workout today) logged this week; b didn't.
    assert m["weekly_active_loggers"] == 3


# ---------------------------------------------------------------------------
# Instant setup
# ---------------------------------------------------------------------------
def test_onboarding_creates_both_plans(client):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/users/onboarding?setup=true", headers=headers, json=ONBOARDING)
    assert res.status_code == 200
    assert res.json()["data"]["setup"] == {"meal_plan": "created", "workout_plan": "created"}
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"] is not None
    assert client.get(f"{API}/workouts/plan/week", headers=headers).json()["data"]["plan"] is not None


def test_updating_answers_without_setup_leaves_plans_alone(client):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/users/onboarding", headers=headers, json=ONBOARDING)
    assert res.json()["data"]["setup"] is None
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"] is None


def test_onboarding_still_succeeds_when_plans_fail(client, monkeypatch):
    async def fail(*args, **kwargs):
        raise RuntimeError("planner exploded")

    monkeypatch.setattr(diet_plan_service, "create_plan", fail)
    monkeypatch.setattr(setup_service.workout_service, "generate_workout_plan", fail)
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/users/onboarding?setup=true", headers=headers, json=ONBOARDING)
    assert res.status_code == 200
    assert res.json()["data"]["setup"] == {"meal_plan": "failed", "workout_plan": "failed"}
    assert client.get(f"{API}/auth/me", headers=headers).json()["data"]["onboarding_completed"] is True


async def test_slow_meal_plan_keeps_building_in_the_background(monkeypatch):
    finished = asyncio.Event()

    async def slow(user_id):
        await asyncio.sleep(0.05)
        finished.set()

    async def quick_workout(user):
        return None

    monkeypatch.setattr(diet_plan_service, "create_plan", slow)
    monkeypatch.setattr(setup_service.workout_service, "generate_workout_plan", quick_workout)
    user = User(email="slow@example.com", password_hash="x")
    result = await setup_service.run(user, wait_seconds=0.001)
    assert result == {"meal_plan": "pending", "workout_plan": "created"}
    await asyncio.wait_for(finished.wait(), 1)


# ---------------------------------------------------------------------------
# Reminder due logic and dedupe
# ---------------------------------------------------------------------------
NOW = datetime(2026, 11, 12, 13, 40, tzinfo=ZoneInfo("Asia/Kolkata"))
MEALS = [
    {"id": "breakfast", "meal_type": "breakfast", "time": "08:30", "items": [{"name": "Poha"}]},
    {"id": "lunch", "meal_type": "lunch", "time": "13:30", "items": [{"name": "Dal"}, {"name": "Rice"}]},
]
NO_WORKOUT = {"time": "18:00", "planned": False, "done": False}
WATER_LOW = {"ml": 500, "goal_ml": 2500}


def _due(now=NOW, settings=None, logged_ids=(), logged_types=(), workout=NO_WORKOUT, water=WATER_LOW):
    return reminder_service.due_reminders(
        now, {**reminder_service.DEFAULT_SETTINGS, **(settings or {})}, MEALS,
        set(logged_ids), set(logged_types), workout, water,
    )


def test_is_due_window():
    assert reminder_service.is_due("13:30", NOW)
    assert not reminder_service.is_due("13:50", NOW)  # not yet
    assert not reminder_service.is_due("12:30", NOW)  # more than an hour late
    assert not reminder_service.is_due("bad", NOW)


def test_meal_reminder_is_due_at_the_plan_time_unless_logged():
    due = _due()
    assert [r["key"] for r in due] == ["meal:lunch"]
    assert "Dal, Rice" in due[0]["body"] and due[0]["url"] == "/today"
    assert _due(logged_ids={"lunch"}) == []
    assert _due(logged_types={"lunch"}) == []
    assert _due(settings={"meals": False}) == []
    assert _due(settings={"enabled": False}) == []


def test_workout_and_water_reminders():
    at_six = NOW.replace(hour=18, minute=5)
    workout = {"time": "18:00", "planned": True, "done": False}
    assert [r["key"] for r in _due(now=at_six, workout=workout)] == ["workout"]
    assert _due(now=at_six, workout={**workout, "done": True}) == []
    assert _due(now=at_six, workout={**workout, "planned": False}) == []

    at_three = NOW.replace(hour=15, minute=10)
    assert [r["key"] for r in _due(now=at_three)] == ["water"]
    assert _due(now=at_three, water={"ml": 2500, "goal_ml": 2500}) == []


def test_workout_reminder_time_follows_the_onboarding_answer():
    settings = dict(reminder_service.DEFAULT_SETTINGS)
    assert reminder_service.workout_reminder_time(settings, "evening") == "18:15"
    assert reminder_service.workout_reminder_time(settings, "varies") == "18:00"
    assert reminder_service.workout_reminder_time({**settings, "workout_time": "07:00"}, "evening") == "07:00"


async def test_claim_send_allows_one_send_per_reminder_per_day():
    assert await push_store.claim_send("u1", "meal:lunch", "2026-11-12") is True
    assert await push_store.claim_send("u1", "meal:lunch", "2026-11-12") is False
    assert await push_store.claim_send("u1", "meal:lunch", "2026-11-13") is True
    assert await push_store.claim_send("u2", "meal:lunch", "2026-11-12") is True


async def _user_with_plan(tz="America/New_York"):
    user = User(email="remind@example.com", password_hash="x", timezone_name=tz)
    await user.save()
    with use_timezone(tz):
        await diet_plan.save_version(user.id, {"meals": MEALS, "targets": {}}, "created", None)
    await push_store.save_subscription(user.id, SUBSCRIPTION["endpoint"], SUBSCRIPTION["keys"])
    return user


async def test_run_sends_due_reminders_once_in_the_users_timezone(push_on):
    user = await _user_with_plan("America/New_York")
    # 18:40 UTC is 13:40 in New York (EST): lunch is due there.
    now = datetime(2026, 11, 12, 18, 40, tzinfo=ZoneInfo("UTC")).astimezone(ZoneInfo("America/New_York"))
    assert await reminder_service.run_for_user(user, now) == 1
    assert '"Time for lunch"' in push_on[0][1]
    # A second run (scheduler plus cron ping) sends nothing new.
    assert await reminder_service.run_for_user(user, now) == 0
    assert len(push_on) == 1


async def test_run_does_nothing_without_vapid_keys():
    user = await _user_with_plan()
    assert await reminder_service.run_due_reminders() == {"users": 0, "sent": 0}
    assert await push_service.send_push(user.id, "t", "b") == 0


def test_subscribe_is_refused_politely_without_keys(client):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/reminders/subscribe", headers=headers, json=SUBSCRIPTION)
    assert res.status_code == 400
    state = client.get(f"{API}/reminders", headers=headers).json()["data"]
    assert state["push_available"] is False and state["public_key"] is None


def test_subscribe_settings_and_test_push(client, push_on):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/reminders/subscribe", headers=headers, json=SUBSCRIPTION)
    assert res.status_code == 200 and res.json()["data"]["subscribed"] is True
    assert client.post(f"{API}/reminders/test", headers=headers).json()["data"]["delivered"] == 1

    res = client.put(f"{API}/reminders", headers=headers, json={"water": False, "workout_time": "06:45"})
    settings = res.json()["data"]["settings"]
    assert settings["water"] is False and settings["workout_time"] == "06:45" and settings["meals"] is True
    assert client.put(f"{API}/reminders", headers=headers, json={"water_time": "25:00"}).status_code == 400
    # Clearing the workout time goes back to following the onboarding answer.
    cleared = client.put(f"{API}/reminders", headers=headers, json={"workout_time": None}).json()["data"]
    assert cleared["settings"]["workout_time"] is None

    res = client.post(f"{API}/reminders/unsubscribe", headers=headers, json={"endpoint": SUBSCRIPTION["endpoint"]})
    assert res.json()["data"]["subscribed"] is False


async def test_expired_subscriptions_are_removed(monkeypatch, push_on):
    class Gone(Exception):
        response = type("R", (), {"status_code": 410})()

    def raise_gone(sub, payload):
        raise Gone()

    monkeypatch.setattr(push_service, "_send_one", raise_gone)
    await push_store.save_subscription("u1", SUBSCRIPTION["endpoint"], SUBSCRIPTION["keys"])
    assert await push_service.send_push("u1", "t", "b") == 0
    assert await push_store.subscriptions_for("u1") == []


def test_cron_endpoint_needs_the_secret(client, monkeypatch):
    assert client.post(f"{API}/reminders/run").status_code == 404  # no secret configured
    monkeypatch.setattr(get_settings(), "CRON_SECRET", "s3cret-value")
    assert client.post(f"{API}/reminders/run").status_code == 403
    assert client.post(f"{API}/reminders/run", headers={"X-Cron-Secret": "wrong"}).status_code == 403
    ok = client.post(f"{API}/reminders/run", headers={"X-Cron-Secret": "s3cret-value"})
    assert ok.status_code == 200 and ok.json()["data"]["sent"] == 0


# ---------------------------------------------------------------------------
# Easy restart
# ---------------------------------------------------------------------------
def test_missed_days_counts_full_days_between():
    today = date(2026, 11, 12)
    assert habit_service.missed_days(today, today) == 0
    assert habit_service.missed_days(today - timedelta(days=1), today) == 0
    assert habit_service.missed_days(today - timedelta(days=3), today) == 2
    assert habit_service.missed_days(None, today) == 0


async def _meal_days_ago(user_id, days):
    day = (local_today() - timedelta(days=days)).isoformat()
    await Meal(user_id, "Poha", 250, 5, 40, 6, log_date=day).save()


def test_today_status_offers_a_fresh_start_after_two_missed_days(client):
    headers, user_id = register_and_login(client)
    status = client.get(f"{API}/today/status", headers=headers).json()["data"]
    assert status["restart"]["show"] is False and status["recovery_checked_in"] is False

    asyncio.run(_meal_days_ago(user_id, 3))
    status = client.get(f"{API}/today/status", headers=headers).json()["data"]
    assert status["restart"] == {"show": True, "missed_days": 2,
                                 "last_log_date": (local_today() - timedelta(days=3)).isoformat()}

    # Logging anything today ends the break.
    client.post(f"{API}/nutrition/water", headers=headers, json={"amount_ml": 250})
    assert client.get(f"{API}/today/status", headers=headers).json()["data"]["restart"]["show"] is False


async def test_never_logged_users_count_from_signup():
    user = User(email="new@example.com", password_hash="x",
                created_at=datetime.now(ZoneInfo("UTC")) - timedelta(days=4))
    await user.save()
    assert (await habit_service.restart_status(user))["show"] is True


async def test_one_comeback_push_per_break_and_no_daily_nagging(push_on):
    user = await _user_with_plan("Asia/Kolkata")
    with use_timezone("Asia/Kolkata"):
        await _meal_days_ago(user.id, 4)
    lunch = datetime.now(ZoneInfo("Asia/Kolkata")).replace(hour=13, minute=40)
    assert await reminder_service.run_for_user(user, lunch) == 1
    assert '"comeback"' in push_on[0][1]  # the comeback, not the lunch reminder
    assert await reminder_service.run_for_user(user, lunch.replace(hour=15)) == 0
    # Not at night.
    await push_store.save_subscription(user.id, "https://push.example.com/other", SUBSCRIPTION["keys"])
    night = lunch.replace(hour=23)
    assert reminder_service.comeback_due(night, reminder_service.DEFAULT_SETTINGS, 3) is False


# ---------------------------------------------------------------------------
# Privacy
# ---------------------------------------------------------------------------
async def test_account_deletion_removes_habit_data(mock_db):
    user_id = "gone-user"
    await analytics_service.track(user_id, "meal_logged")
    await push_store.save_subscription(user_id, SUBSCRIPTION["endpoint"], SUBSCRIPTION["keys"])
    await push_store.save_settings(user_id, {"meals": False})
    await push_store.claim_send(user_id, "water", "2026-11-12")
    await privacy_service.delete_user_data(user_id)
    for collection in ("analytics_events", "push_subscriptions", "reminder_settings", "reminder_sends"):
        assert await mock_db[collection].count_documents({"user_id": user_id}) == 0
