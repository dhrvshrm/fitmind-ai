"""Training for a sport: strength by season phase, drills, match weeks and match-day food."""
from datetime import date

import pytest

from app.services import diet_plan_service
from app.workouts import planner, sports
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"


def _week(setup, level="intermediate", days=5, owned=("full_gym",)):
    return planner.build_week(goal="athletic_performance", experience=level, equipment=list(owned), injuries=[],
                              days_per_week=days, sport=setup)


def _kinds(plan):
    return [d["workout_type"] for d in plan["week"]]


def test_no_sport_means_no_change():
    plain = planner.build_week(goal="athletic_performance", experience="intermediate", equipment=["full_gym"],
                               injuries=[], days_per_week=5)
    for off in (None, {"sport": "none"}, {"sport": "chess"}):
        assert _week(off)["week"] == plain["week"]


@pytest.mark.parametrize("phase, strength", [("off_season", 4), ("pre_season", 3), ("in_season", 2)])
def test_the_season_phase_sets_the_strength_days(phase, strength):
    plan = _week({"sport": "football", "phase": phase}, days=6)
    assert _kinds(plan).count("strength") == strength
    assert plan["meta"]["sport"]["phase"] == phase and "sport_training" in plan["meta"]["notes"]


def test_in_season_strength_is_a_set_shorter():
    off = [e["sets"] for d in _week({"sport": "football", "phase": "off_season"})["week"]
           if d["workout_type"] == "strength" for e in d["exercises"]]
    on = [e["sets"] for d in _week({"sport": "football", "phase": "in_season"})["week"]
          if d["workout_type"] == "strength" for e in d["exercises"]]
    assert max(on) < max(off) and min(on) >= sports.MIN_SETS


def test_sport_days_carry_the_drills():
    plan = _week({"sport": "football", "phase": "in_season"}, days=5)
    sport_days = [d for d in plan["week"] if d["focus"] == "Sport conditioning"]
    assert sport_days
    names = [e["name"] for e in sport_days[0]["exercises"]]
    assert "Sprints" in names and "Copenhagen plank" in names
    # Drills don't count as weekly hard sets.
    assert all(e["pattern"] == "conditioning" for e in sport_days[0]["exercises"])


def test_football_adds_hamstring_and_calf_work_up_front():
    plan = _week({"sport": "football", "phase": "off_season"}, days=3)
    day = next(d for d in plan["week"] if d["workout_type"] == "strength")
    patterns = [e["pattern"] for e in day["exercises"]]
    assert "knee_flexion" in patterns and "calf" in patterns


def test_a_match_week_keeps_strength_away_from_the_match():
    plan = _week({"sport": "football", "phase": "in_season", "match_day": 5}, days=5)
    by_day = {d["day"]: d for d in plan["week"]}
    assert by_day["Saturday"]["focus"] == "Match day" and by_day["Saturday"]["match"] is True
    assert by_day["Friday"]["workout_type"] != "strength" and by_day["Friday"]["focus"] == "Light day before the match"
    assert by_day["Sunday"]["focus"] == "Recovery after the match"


def test_strength_days_are_spread_out_and_sunday_rests():
    plan = _week({"sport": "running", "phase": "off_season"}, days=5)
    strength = [i for i, k in enumerate(_kinds(plan)) if k == "strength"]
    assert strength == [0, 2, 5]  # runners: three at most, never back to back
    assert plan["week"][6]["workout_type"] == "rest"


def test_beginners_still_cap_at_four_strength_days():
    plan = _week({"sport": "football", "phase": "off_season", "match_day": 6}, level="beginner", days=6, owned=())
    assert _kinds(plan).count("strength") <= 4


def test_match_status():
    setup = sports.setup_of({"sport": "cricket", "match_day": 6})
    assert sports.match_status(setup, 6) == "match"
    assert sports.match_status(setup, 5) == "pre_match"
    assert sports.match_status(setup, 2) is None
    assert sports.match_status(sports.setup_of({"sport": "cricket", "match_day": -1}), 6) is None


# --- Through the API ---------------------------------------------------------------
def _player(client, sport):
    headers, _ = register_and_login(client)
    assert client.post(f"{API}/users/onboarding", headers=headers, json=ONBOARDING).status_code == 200
    res = client.put(f"{API}/users/personalisation", headers=headers, json={"sport": sport})
    assert res.status_code == 200, res.text
    return headers


def test_a_footballer_gets_a_football_plan_and_a_changed_sport_flags_it(client):
    headers = _player(client, {"sport": "football", "phase": "in_season", "match_day": 5})
    client.post(f"{API}/workouts/generate", headers=headers, json={})
    data = client.get(f"{API}/workouts/plan/week", headers=headers).json()["data"]
    assert data["plan"]["meta"]["sport"]["sport"] == "football" and data["plan"]["sport_changed"] is False
    client.put(f"{API}/users/personalisation", headers=headers, json={"sport": {"phase": "off_season"}})
    assert client.get(f"{API}/workouts/plan/week", headers=headers).json()["data"]["plan"]["sport_changed"] is True
    # Switching the sport off is a change too.
    client.post(f"{API}/workouts/generate", headers=headers, json={})
    client.put(f"{API}/users/personalisation", headers=headers, json={"sport": {"sport": "none"}})
    assert client.get(f"{API}/workouts/plan/week", headers=headers).json()["data"]["plan"]["sport_changed"] is True


def test_match_day_meals_load_carbs(client, ai_providers, monkeypatch):
    today = date(2026, 11, 28)  # a Saturday
    monkeypatch.setattr(diet_plan_service, "local_today", lambda *a, **k: today)
    headers = _player(client, {"sport": "football", "phase": "in_season", "match_day": today.weekday()})
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    assert {"code": "match_day", "values": {}} in plan["notes"]
    prompts = [c["prompt"] for c in ai_providers.calls if "Plan one day of meals" in c["prompt"]]
    assert prompts and "match day" in prompts[-1]


def test_the_day_before_a_match_gets_its_own_note(client, ai_providers, monkeypatch):
    today = date(2026, 11, 27)  # a Friday
    monkeypatch.setattr(diet_plan_service, "local_today", lambda *a, **k: today)
    headers = _player(client, {"sport": "football", "match_day": (today.weekday() + 1) % 7})
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    assert {"code": "pre_match", "values": {}} in plan["notes"]


def test_in_season_aims_for_maintenance_volume():
    assert _week({"sport": "football", "phase": "in_season"})["meta"]["volume_target"] == sports.MAINTENANCE_VOLUME
    assert _week({"sport": "football", "phase": "off_season"})["meta"]["volume_target"] == [10, 20]
