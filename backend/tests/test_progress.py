"""Phase 10: progress and motivation."""
import asyncio
import json
from datetime import date, timedelta

from app.models import challenge as challenge_store
from app.models.nutrition import Meal
from app.models.user import User
from app.models.weight import WeightLog
from app.models.workout import WorkoutLog
from app.progress import adaptive, flex, patterns, trend
from app.services import privacy_service
from app.utils.time import local_today
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"


def _onboard(client, email="p@example.com", **overrides):
    headers, user_id = register_and_login(client, email)
    client.post(f"{API}/users/onboarding", headers=headers, json={**ONBOARDING, **overrides})
    return headers, user_id


def _days_ago(n: int) -> str:
    return (local_today() - timedelta(days=n)).isoformat()


async def _seed_meals(user_id: str, kcal: float, days: range, protein: float = 120, meals_per_day: int = 2):
    for n in days:
        for i in range(meals_per_day):
            await Meal(user_id, f"meal {i}", kcal / meals_per_day, protein / meals_per_day, 100, 30,
                       log_date=_days_ago(n), meal_type="lunch" if i else "breakfast", eaten_at="13:00").save()


async def _seed_weights(user_id: str, start_kg: float, kg_per_day: float, days: range):
    for n in days:
        await WeightLog(user_id, round(start_kg + kg_per_day * (max(days) - n), 2), log_date=_days_ago(n)).save()


# ---------------------------------------------------------------------------
# Trend maths
# ---------------------------------------------------------------------------
def test_ewma_of_a_constant_series_is_constant():
    readings = [(f"2026-01-{d:02d}", 70.0) for d in range(1, 15)]
    assert all(abs(v - 70.0) < 1e-9 for v in trend.ewma(readings))


def test_trend_smooths_noise_and_reports_weekly_rate():
    start = date(2026, 1, 1)
    # Losing 0.5 kg/week with +-0.6 kg of day-to-day noise.
    readings = [((start + timedelta(days=i)).isoformat(), 80 - 0.5 / 7 * i + (0.6 if i % 2 else -0.6)) for i in range(42)]
    summary = trend.summarize(readings)["summary"]
    assert summary["direction"] == "down"
    assert -0.7 < summary["weekly_rate"] < -0.3
    raw_jumps = max(abs(readings[i][1] - readings[i - 1][1]) for i in range(1, 42))
    trend_values = trend.ewma(readings)
    trend_jumps = max(abs(trend_values[i] - trend_values[i - 1]) for i in range(1, 42))
    assert trend_jumps < raw_jumps / 3


def test_trend_has_no_rate_until_there_is_enough_data():
    summary = trend.summarize([("2026-01-01", 70.0), ("2026-01-02", 70.4)])["summary"]
    assert summary["weekly_rate"] is None and summary["direction"] is None


def test_weight_endpoint_returns_trend_points(client):
    headers, _ = _onboard(client)
    for n, kg in ((10, 71.0), (6, 70.6), (3, 70.4), (0, 70.0)):
        res = client.post(f"{API}/progress/weight", headers=headers, json={"weight_kg": kg, "date": _days_ago(n)} if n <= 7 else {"weight_kg": kg})
        assert res.status_code == 200
    data = client.get(f"{API}/progress/weight", headers=headers).json()["data"]
    assert data["points"] and all("trend" in p for p in data["points"])
    # Backfilling more than a week is refused.
    assert client.post(f"{API}/progress/weight", headers=headers, json={"weight_kg": 70, "date": _days_ago(20)}).status_code == 400


def test_waist_measurements_have_their_own_trend(client):
    headers, _ = _onboard(client)
    for n, waist in ((6, 90), (3, 89.5), (0, 89)):
        res = client.post(f"{API}/progress/measurements", headers=headers,
                          json={"waist_cm": waist, "hip_cm": 100, "date": _days_ago(n)})
        assert res.status_code == 200
    data = client.get(f"{API}/progress/measurements", headers=headers).json()["data"]
    assert len(data["waist"]["points"]) == 3 and len(data["hip"]["points"]) == 3
    assert data["waist"]["summary"]["current_trend"] < 90
    assert client.post(f"{API}/progress/measurements", headers=headers, json={}).status_code == 400


# ---------------------------------------------------------------------------
# Adaptive target
# ---------------------------------------------------------------------------
TARGETS = {"calories": 2000, "tdee": 2400, "adjustment_kcal": -400, "flags": []}


def _estimate(intake_kcal: float, kg_per_day: float, logged: int = 21, weigh_ins: int = 14, **kw):
    today = date(2026, 3, 1)
    intake = {(today - timedelta(days=n)).isoformat(): intake_kcal for n in range(1, logged + 1)}
    weights = [((today - timedelta(days=n)).isoformat(), 80 - kg_per_day * n) for n in range(2 * weigh_ins, 0, -2)]
    return adaptive.estimate(today=today, intake=intake, weights=weights, targets={**TARGETS, **kw.pop("targets", {})},
                             floor_kcal=kw.pop("floor", 1500), **kw)


def test_adaptive_needs_enough_logged_days_and_weigh_ins():
    result = _estimate(2000, 0.0, logged=8, weigh_ins=3)
    assert result["status"] == "insufficient_data"
    assert set(result["missing"]) >= {"logged_days", "weigh_ins"}
    assert result["required_logged_days"] == 14


def test_adaptive_suggests_a_capped_change_when_maintenance_is_higher():
    # Eating 2,000 a day and losing 0.5 kg a week -> maintenance about 2,550.
    result = _estimate(2000, -0.5 / 7)
    assert result["status"] == "suggestion"
    assert 2450 <= result["estimated_tdee"] <= 2650
    # The ideal target is ~2,150, a +150 change.
    assert result["suggested_target"] in range(2100, 2210)
    assert abs(result["change"]) <= adaptive.MAX_STEP_KCAL


def test_adaptive_never_suggests_below_the_floor():
    # Gaining weight on 1,600: maintenance looks low, the suggestion is held at the floor.
    result = _estimate(1600, 0.3 / 7, targets={"calories": 1600, "tdee": 2000})
    assert result["status"] in ("suggestion", "on_track", "low_confidence")
    if result["status"] == "suggestion":
        assert result["suggested_target"] >= 1500


def test_adaptive_on_track_and_low_confidence():
    assert _estimate(2000, -0.4 / 7)["status"] == "on_track"
    # Far from the formula estimate: most likely missed logging, so no suggestion.
    assert _estimate(1000, 0.0, targets={"calories": 1000})["status"] in ("low_confidence", "insufficient_data")


def test_adaptive_waits_a_week_after_a_decision():
    result = _estimate(2000, -0.5 / 7, last_decision="2026-02-27")
    assert result["status"] == "cooldown"


def test_adaptive_endpoint_with_insufficient_and_sufficient_data(client):
    headers, user_id = _onboard(client)
    status = client.get(f"{API}/progress/adaptive-target", headers=headers).json()["data"]
    assert status["status"] == "insufficient_data"

    target = client.get(f"{API}/users/targets", headers=headers).json()["data"]
    calories = target["calories"] if "calories" in target else target["targets"]["calories"]
    # Steady weight while eating 350 kcal over target: maintenance is higher than thought.
    asyncio.run(_seed_meals(user_id, calories + 350, range(1, 22)))
    asyncio.run(_seed_weights(user_id, 70.0, 0.0, range(1, 28, 2)))
    status = client.get(f"{API}/progress/adaptive-target", headers=headers).json()["data"]
    assert status["status"] == "suggestion", status
    assert status["suggested_target"] > calories

    # Accepting a different number than shown is refused; the shown one works.
    assert client.post(f"{API}/progress/adaptive-target/accept", headers=headers,
                       json={"calories": status["suggested_target"] + 50}).status_code == 409
    res = client.post(f"{API}/progress/adaptive-target/accept", headers=headers,
                      json={"calories": status["suggested_target"]})
    assert res.status_code == 200
    user = asyncio.run(User.get_by_id(user_id))
    assert user.targets["calories"] == status["suggested_target"]
    assert "adaptive_target" in user.targets["flags"]
    # Then it waits before asking again.
    assert client.get(f"{API}/progress/adaptive-target", headers=headers).json()["data"]["status"] in ("cooldown", "on_track")


# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------
def _record(day: date, **kw):
    base = {"date": day.isoformat(), "meal_count": 3, "meal_types": {"breakfast", "lunch", "dinner"},
            "meal_times": ["08:30", "13:00", "20:00"], "calories": 2000, "protein": 120,
            "water_ml": 2500, "workouts": 0, "flexible": False}
    return {**base, **kw}


def test_weekend_protein_and_late_eating_patterns_need_evidence():
    start = date(2026, 3, 2)  # A Monday.
    days = []
    for i in range(28):
        d = start + timedelta(days=i)
        weekend = d.weekday() >= 5
        days.append(_record(d, protein=70 if weekend else 120,
                            meal_times=["08:30", "13:00", "23:15"] if i % 3 == 0 else ["08:30", "13:00", "20:00"]))
    codes = {p["code"] for p in patterns.detect(days, {"protein": 110, "calories": 2000, "water_ml": 2500}, set())}
    assert "protein_low_weekends" in codes
    assert "late_night_eating" in codes
    assert "low_water" not in codes

    # A single low weekend isn't enough evidence.
    few = days[:6]
    assert patterns.protein_lower_on_weekends(few) is None


def test_skipped_breakfast_low_water_and_missed_weekday():
    start = date(2026, 3, 2)
    days = [
        _record(start + timedelta(days=i), meal_types={"lunch", "dinner"}, meal_times=["13:00", "20:30"],
                water_ml=900, workouts=0 if (start + timedelta(days=i)).weekday() == 0 else 1)
        for i in range(28)
    ]
    found = {p["code"]: p for p in patterns.detect(days, {"protein": 100, "calories": 2000, "water_ml": 2500}, {0, 2, 4})}
    assert "skipped_breakfast" in found
    assert "low_water" in found
    assert found["missed_workout_weekdays"]["values"]["weekdays"] == [0]


def test_patterns_endpoint_is_quiet_without_data(client):
    headers, _ = _onboard(client)
    data = client.get(f"{API}/progress/patterns", headers=headers).json()["data"]
    assert data["patterns"] == []


# ---------------------------------------------------------------------------
# Flexible days
# ---------------------------------------------------------------------------
def test_flexible_rebalance_is_gentle_and_never_below_the_floor():
    monday = date(2026, 3, 2)
    plan = flex.plan_week(monday, 1300, 1200, [{"date": "2026-03-07", "extra_kcal": 1000, "marked_on": "2026-03-02"}])
    assert plan["2026-03-07"]["calories"] == 2300
    others = [v for d, v in plan.items() if d != "2026-03-07"]
    assert all(v["calories"] >= 1200 for v in others)
    assert all(v["base"] - v["calories"] <= 130 for v in others)

    roomy = flex.plan_week(monday, 2400, 1500, [{"date": "2026-03-08", "extra_kcal": 600, "marked_on": "2026-03-04"}])
    # Only days on or after the day it was marked give anything back.
    assert roomy["2026-03-02"]["calories"] == 2400 and roomy["2026-03-03"]["calories"] == 2400
    assert all(roomy[d]["calories"] == 2250 for d in ("2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07"))


def test_no_rebalance_where_a_deficit_is_not_allowed():
    plan = flex.plan_week(date(2026, 3, 2), 2000, 1200, [{"date": "2026-03-07", "extra_kcal": 500, "marked_on": "2026-03-02"}], no_deficit=True)
    assert all(v["calories"] == 2000 for d, v in plan.items() if d != "2026-03-07")


def test_flexible_day_endpoints_and_effective_target(client):
    headers, _ = _onboard(client)
    today = local_today()
    base = client.get(f"{API}/progress/effective-target", headers=headers).json()["data"]["calories"]
    flex_day = today + timedelta(days=(5 - today.weekday()) % 7 or 7)  # A coming Saturday.
    res = client.post(f"{API}/progress/flexible-days", headers=headers,
                      json={"date": flex_day.isoformat(), "reason": "wedding", "extra_kcal": 600})
    assert res.status_code == 200
    on_day = client.get(f"{API}/progress/effective-target", headers=headers,
                        params={"date": flex_day.isoformat()}).json()["data"]
    assert on_day["flexible"] and on_day["calories"] == base + 600
    week = client.get(f"{API}/progress/flexible-days", headers=headers,
                      params={"week_of": flex_day.isoformat()}).json()["data"]
    assert len(week["days"]) == 7 and week["flexible_days"][0]["reason"] == "wedding"
    assert all(d["calories"] >= 1500 for d in week["days"])

    assert client.post(f"{API}/progress/flexible-days", headers=headers,
                       json={"date": flex_day.isoformat(), "reason": "nope"}).status_code == 400
    assert client.delete(f"{API}/progress/flexible-days/{flex_day.isoformat()}", headers=headers).status_code == 200
    after = client.get(f"{API}/progress/effective-target", headers=headers, params={"date": flex_day.isoformat()}).json()["data"]
    assert after["calories"] == base


# ---------------------------------------------------------------------------
# Weekly insight and summary
# ---------------------------------------------------------------------------
def _seed_last_week(user_id: str):
    monday = flex.week_start(local_today()) - timedelta(days=7)
    offsets = [(local_today() - (monday + timedelta(days=i))).days for i in range(7)]
    asyncio.run(_seed_meals(user_id, 2200, range(min(offsets), max(offsets) + 1), protein=60))


def test_weekly_insight_falls_back_to_rules_and_is_cached(client, ai_providers):
    headers, user_id = _onboard(client)
    assert client.get(f"{API}/progress/weekly-insight", headers=headers).json()["data"]["status"] == "not_enough_data"
    _seed_last_week(user_id)
    first = client.get(f"{API}/progress/weekly-insight", headers=headers).json()["data"]
    assert first["status"] == "ready" and first["source"] == "rule"
    assert first["went_well"] and first["one_change"]
    calls = [c for c in ai_providers.calls if "weekly note" in c["prompt"]]
    second = client.get(f"{API}/progress/weekly-insight", headers=headers).json()["data"]
    assert second["went_well"] == first["went_well"]
    # Not retried the same day.
    assert len([c for c in ai_providers.calls if "weekly note" in c["prompt"]]) == len(calls)


def test_weekly_insight_uses_ai_once_per_week(client, ai_providers):
    headers, user_id = _onboard(client)
    _seed_last_week(user_id)
    ai_providers.gemini.append(json.dumps({
        "headline": "Consistent logging week",
        "went_well": "You logged food on all seven days, so your numbers are solid.",
        "one_change": "Add a bowl of dal or curd to lunch to lift protein closer to your target.",
    }))
    first = client.get(f"{API}/progress/weekly-insight", headers=headers).json()["data"]
    assert first["source"] == "ai"
    client.get(f"{API}/progress/weekly-insight", headers=headers)
    insight_calls = [c for c in ai_providers.calls if "weekly note" in c["prompt"]]
    assert len(insight_calls) == 1
    # The prompt only carries computed numbers.
    assert "meal_days" in insight_calls[0]["prompt"]


def test_week_summary_counts(client):
    headers, user_id = _onboard(client)
    asyncio.run(_seed_meals(user_id, 2000, range(0, 3)))
    data = client.get(f"{API}/progress/week-summary", headers=headers).json()["data"]
    assert data["meal_days"] == 3 and data["days"] == 7


# ---------------------------------------------------------------------------
# Photos
# ---------------------------------------------------------------------------
def test_photos_are_unavailable_without_r2(client):
    headers, _ = _onboard(client)
    data = client.get(f"{API}/progress/photos", headers=headers).json()["data"]
    assert data == {"available": False, "photos": []}
    res = client.post(f"{API}/progress/photos", headers=headers,
                      files={"photo": ("p.jpg", b"\xff\xd8\xff\xe0" + b"0" * 100, "image/jpeg")})
    assert res.status_code == 503


def test_photo_upload_with_r2_uses_private_keys(client, monkeypatch):
    from app.services import cloud_service

    stored = {}

    async def upload(key, data, content_type):
        stored[key] = data
        return True

    async def sign(key, expires_seconds=300):
        return f"https://signed.example/{key}?sig=1"

    async def delete(key):
        stored.pop(key, None)
        return True

    monkeypatch.setattr(cloud_service, "is_private_storage_configured", lambda: True)
    monkeypatch.setattr(cloud_service, "upload_private", upload)
    monkeypatch.setattr(cloud_service, "signed_url", sign)
    monkeypatch.setattr(cloud_service, "delete_private", delete)
    headers, user_id = _onboard(client)

    bad = client.post(f"{API}/progress/photos", headers=headers, files={"photo": ("x.jpg", b"not an image", "image/jpeg")})
    assert bad.status_code == 415
    ok = client.post(f"{API}/progress/photos", headers=headers,
                     files={"photo": ("p.png", b"\x89PNG\r\n\x1a\n" + b"0" * 100, "image/png")})
    assert ok.status_code == 200
    key = next(iter(stored))
    assert key.startswith(f"progress_photos/{user_id}/")
    listed = client.get(f"{API}/progress/photos", headers=headers).json()["data"]
    assert listed["available"] and "sig=" in listed["photos"][0]["url"]
    assert client.delete(f"{API}/progress/photos/{listed['photos'][0]['id']}", headers=headers).status_code == 200
    assert stored == {}
    assert "progress_photos/{user_id}/" in cloud_service.USER_FILE_PREFIXES


# ---------------------------------------------------------------------------
# Friend challenges
# ---------------------------------------------------------------------------
def _friends(client):
    a_headers, a_id = _onboard(client, "a@example.com")
    b_headers, b_id = _onboard(client, "b@example.com")
    request_id = client.post(f"{API}/friends/request", headers=a_headers, json={"to_user_id": b_id}).json()["data"]["request_id"]
    client.put(f"{API}/friends/accept/{request_id}", headers=b_headers)
    return a_headers, a_id, b_headers, b_id


def test_challenges_only_between_friends(client):
    a_headers, _ = _onboard(client, "a@example.com")
    _, stranger_id = _onboard(client, "s@example.com")
    res = client.post(f"{API}/challenges", headers=a_headers, json={"friend_id": stranger_id, "kind": "workouts_week"})
    assert res.status_code == 403


def test_challenge_progress_from_logs_and_xp_paid_once(client):
    a_headers, a_id, b_headers, b_id = _friends(client)
    created = client.post(f"{API}/challenges", headers=a_headers, json={"friend_id": b_id, "kind": "workouts_week"})
    assert created.status_code == 200
    challenge_id = created.json()["data"]["id"]
    # The same challenge can't be sent twice while it's open.
    assert client.post(f"{API}/challenges", headers=a_headers, json={"friend_id": b_id, "kind": "workouts_week"}).status_code == 409
    accepted = client.post(f"{API}/challenges/{challenge_id}/accept", headers=b_headers).json()["data"]
    assert accepted["status"] == "active" and accepted["me"]["count"] == 0

    # Move the window back so earlier workouts fall inside it, then log three workout days.
    asyncio.run(challenge_store.update(challenge_id, {"start_date": _days_ago(4), "end_date": _days_ago(-2)}))

    async def seed():
        for n in (3, 2, 1):
            await WorkoutLog(a_id, [], 30, log_date=_days_ago(n)).save()
        # A workout before the window doesn't count.
        await WorkoutLog(a_id, [], 30, log_date=_days_ago(10)).save()

    asyncio.run(seed())
    xp_before = asyncio.run(User.get_by_id(a_id)).xp
    first = client.get(f"{API}/challenges", headers=a_headers).json()["data"]["challenges"][0]
    assert first["me"] == {"count": 3, "goal": 3, "completed": True}
    assert first["them"]["count"] == 0
    assert first["just_rewarded"] is True
    second = client.get(f"{API}/challenges", headers=a_headers).json()["data"]["challenges"][0]
    assert second["just_rewarded"] is False and second["rewarded"] is True
    assert asyncio.run(User.get_by_id(a_id)).xp == xp_before + 40


def test_declining_a_challenge(client):
    a_headers, _, b_headers, b_id = _friends(client)
    challenge_id = client.post(f"{API}/challenges", headers=a_headers,
                               json={"friend_id": b_id, "kind": "log_meals_5"}).json()["data"]["id"]
    assert client.post(f"{API}/challenges/{challenge_id}/decline", headers=b_headers).status_code == 200
    statuses = [c["status"] for c in client.get(f"{API}/challenges", headers=b_headers).json()["data"]["challenges"]]
    assert statuses == ["declined"]


# ---------------------------------------------------------------------------
# Account deletion
# ---------------------------------------------------------------------------
def test_account_deletion_removes_progress_data(client, mock_db):
    a_headers, a_id, b_headers, b_id = _friends(client)
    client.post(f"{API}/progress/measurements", headers=a_headers, json={"waist_cm": 85})
    client.post(f"{API}/progress/flexible-days", headers=a_headers,
                json={"date": local_today().isoformat(), "reason": "festival"})
    client.post(f"{API}/challenges", headers=a_headers, json={"friend_id": b_id, "kind": "water_week"})
    for name in ("body_measurements", "flexible_days", "target_history", "weekly_insights",
                 "progress_photos", "friend_challenges"):
        assert name in privacy_service.USER_DATA_COLLECTIONS

    assert client.delete(f"{API}/settings/account", headers=a_headers).status_code == 200

    async def count():
        return {
            name: await mock_db[name].count_documents({"$or": [{f: a_id} for f in fields]})
            for name, fields in privacy_service.USER_DATA_COLLECTIONS.items()
        }

    assert all(v == 0 for v in asyncio.run(count()).values())
