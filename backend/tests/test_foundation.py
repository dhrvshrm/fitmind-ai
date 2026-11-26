"""The foundation phase for beginners whose bodies aren't ready for push-ups and squats yet."""
from datetime import date, datetime, timedelta, timezone

import pytest

from app.services import activity_service, workout_service
from app.workouts import catalog, foundation, planner
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"
TODAY = date(2026, 11, 26)


@pytest.mark.parametrize(
    "level, age, weight, height, activity, expected",
    [
        ("beginner", 54, 101, 165, None, True),       # BMI 37 and over 50
        ("beginner", 25, 95, 170, None, True),        # BMI 33
        ("beginner", 55, 65, 170, None, True),        # over 50
        ("beginner", 30, 70, 175, "sedentary", True),
        ("beginner", 28, 70, 175, "moderate", False),  # a fit beginner
        ("intermediate", 54, 101, 165, None, False),  # trained already
    ],
)
def test_who_starts_in_the_foundation_phase(level, age, weight, height, activity, expected):
    assert foundation.is_deconditioned(level, age, weight, height, activity) is expected


def test_the_phase_lasts_six_weeks_and_steps_grow_each_week():
    joined = datetime(2026, 11, 1, tzinfo=timezone.utc)
    assert foundation.week_of(joined, date(2026, 11, 1)) == 1
    assert foundation.week_of(joined, date(2026, 11, 8)) == 2
    assert foundation.week_of(joined, date(2026, 12, 12)) == 6
    assert foundation.week_of(joined, date(2026, 12, 13)) is None
    targets = [foundation.step_target(w) for w in range(1, 7)]
    assert targets[0] == 4000 and targets == sorted(targets) and targets[-1] <= foundation.STEP_GOAL


def test_doctor_check_for_the_highest_risk_starts():
    assert foundation.needs_doctor_check(54, 101, 165)      # 54, BMI 37
    assert not foundation.needs_doctor_check(54, 80, 165)   # BMI 29
    assert foundation.needs_doctor_check(68, 70, 170)       # 65+
    assert foundation.needs_doctor_check(30, 125, 170)      # BMI 43


def _foundation(owned, injuries=(), days=6):
    return planner.build_week(goal="fat_loss", experience="beginner", equipment=owned, injuries=list(injuries),
                              days_per_week=days, foundation_week=1, doctor_check=True)


def test_at_home_it_is_three_gentle_sessions_walks_and_rest():
    plan = _foundation([])
    kinds = [d["workout_type"] for d in plan["week"]]
    assert [i for i, k in enumerate(kinds) if k == "strength"] == [0, 2, 4]
    assert kinds.count("cardio") == 3 and kinds[6] == "rest"
    ids = [e["exercise_id"] for e in plan["week"][0]["exercises"]]
    assert ids == ["Wall_Push-Up", "Sit_To_Stand", "Backpack_Row", "Butt_Lift_Bridge", "Standing_Calf_Raises", "Dead_Bug"]
    for entry in plan["week"][0]["exercises"]:
        assert entry["sets"] == 2 and entry["rir"] == 4 and entry["skill"] == "easy" or entry["exercise_id"] == "Backpack_Row"
    hard = {"Pushups", "Pike_Push-Up", "Bodyweight_Squat", "Incline_Push-Up"}
    assert not hard & {e["exercise_id"] for d in plan["week"] for e in d["exercises"]}
    meta = plan["meta"]
    assert meta["split"] == "foundation" and meta["foundation"]["step_target"] == 4000
    assert {"foundation_phase", "doctor_check"} <= set(meta["notes"])


def test_in_a_gym_it_uses_supported_machines():
    ids = [e["exercise_id"] for e in _foundation(["full_gym"])["week"][0]["exercises"]]
    assert ids[:3] == ["Machine_Bench_Press", "Leg_Press", "Seated_Cable_Rows"]


def test_fewer_chosen_days_mean_fewer_sessions():
    kinds = [d["workout_type"] for d in _foundation([], days=2)["week"]]
    assert kinds.count("strength") == 2 and kinds.count("cardio") == 0


def test_a_sore_knee_skips_the_sit_to_stand():
    ids = [e["exercise_id"] for e in _foundation([], injuries=["knee pain"])["week"][0]["exercises"]]
    assert "Sit_To_Stand" not in ids and "Wall_Push-Up" in ids


def test_the_ladders_lead_to_harder_moves():
    assert catalog.get("Wall_Push-Up").coaching.harder == "Incline_Push-Up"
    assert catalog.get("Incline_Push-Up").coaching.harder == "Pushups"
    assert catalog.get("Sit_To_Stand").coaching.harder == "Bodyweight_Squat"


def test_a_fit_beginner_never_gets_the_foundation_moves():
    for owned in ([], ["dumbbells"], ["full_gym"]):
        week = planner.build_week(goal="fat_loss", experience="beginner", equipment=owned, injuries=[],
                                  days_per_week=4)["week"]
        assert not foundation.FOUNDATION_ONLY & {e["exercise_id"] for d in week for e in d["exercises"]}


# --- Through the API ---------------------------------------------------------------
def _onboard(client, monkeypatch, joined_days_ago=0, **profile):
    headers, user_id = register_and_login(client)
    body = {**ONBOARDING, "age": 54, "weight_kg": 101, "height_cm": 165, "experience_level": "beginner",
            "fitness_goal": "fat_loss", "available_equipment": [], "workout_days_per_week": 6, **profile}
    assert client.post(f"{API}/users/onboarding", headers=headers, json=body).status_code == 200
    later = date.today() + timedelta(days=joined_days_ago)
    monkeypatch.setattr(workout_service, "local_today", lambda *a, **k: later)
    monkeypatch.setattr(activity_service, "local_today", lambda *a, **k: later)
    return headers


def test_a_heavy_first_timer_gets_the_foundation_plan_and_a_low_step_target(client, monkeypatch):
    headers = _onboard(client, monkeypatch)
    client.post(f"{API}/workouts/generate", headers=headers, json={})
    plan = client.get(f"{API}/workouts/plan/week", headers=headers).json()["data"]["plan"]
    assert plan["meta"]["split"] == "foundation" and "doctor_check" in plan["meta"]["notes"]
    settings = client.get(f"{API}/activity/settings", headers=headers).json()["data"]
    assert settings["effective_step_target"] == 4000


def test_after_six_weeks_the_normal_beginner_plan_takes_over(client, monkeypatch):
    headers = _onboard(client, monkeypatch, joined_days_ago=50)
    client.post(f"{API}/workouts/generate", headers=headers, json={})
    plan = client.get(f"{API}/workouts/plan/week", headers=headers).json()["data"]["plan"]
    assert plan["meta"]["split"] != "foundation"
    assert [d["workout_type"] for d in plan["week"]].count("strength") == 4


def test_the_foundation_warm_up_has_no_jumping_and_stays_standing():
    from app.workouts import warm_up

    day = _foundation([])["week"][0]
    plan = warm_up.for_day(day, ["bodyweight"], set())
    assert plan["pulse"][0]["name"] == "March on the spot"
    moves = {m["exercise_id"] for m in plan["mobility"]}
    assert not moves & {"Inchworm", "Worlds_Greatest_Stretch", "Bodyweight_Squat", "Fast_Skipping"}
