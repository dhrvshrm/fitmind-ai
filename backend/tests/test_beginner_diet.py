"""A beginner's first plans: simple, familiar home food, with protein building up over a month."""
from datetime import date, datetime, timedelta, timezone

import pytest

from app.models.user import User
from app.nutrition import meal_planner
from app.nutrition.diet_rules import DietRules
from app.services import diet_plan_service as svc
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"
TARGETS = {"calories": 2000, "protein": 120, "carbs": 230, "fats": 60, "fiber": 30}


def _fallback_user(level, joined):
    user = User.__new__(User)
    user.experience_level = level
    user.created_at = joined
    return user


@pytest.mark.parametrize("days, share", [(0, 0.8), (13, 0.8), (14, 0.9), (27, 0.9), (28, None), (90, None)])
def test_a_beginners_protein_builds_up_over_a_month(days, share):
    ramp = svc.protein_ramp(_fallback_user("beginner", datetime.now(timezone.utc) - timedelta(days=days)))
    assert (ramp["share"] if ramp else None) == share


def test_trained_people_get_their_full_protein_from_day_one():
    assert svc.protein_ramp(_fallback_user("intermediate", datetime.now(timezone.utc))) is None


def test_the_ramp_keeps_calories_and_moves_the_rest_to_carbs():
    ramped = svc.ramped_targets(TARGETS, {"share": 0.8, "full_on": "2026-12-24"})
    assert ramped["protein"] == 96
    assert ramped["carbs"] == TARGETS["carbs"] + 24
    assert ramped["calories"] == TARGETS["calories"] and ramped["fats"] == TARGETS["fats"]
    assert 4 * ramped["protein"] + 4 * ramped["carbs"] == 4 * TARGETS["protein"] + 4 * TARGETS["carbs"]


def test_a_beginner_food_list_is_everyday_home_food():
    rules = DietRules.from_preferences({"diet_type": "vegetarian"})
    simple = meal_planner.food_pool(rules, {}, (), None, simple=True)
    normal = meal_planner.food_pool(rules, {})
    assert all(meal_planner.is_familiar(f) for f in simple)
    assert len(simple) >= meal_planner.MIN_FAMILIAR_FOODS
    for staple in ("indb:ASC096", "indb:ASC113", "indb:ASC155", "est:paneer"):  # roti, rice, dal, paneer
        assert staple in {f.id for f in simple}
    assert {f.id for f in normal} - {f.id for f in simple}  # something fussier was left out


def test_a_beginner_plan_is_simple_and_ramps_protein(client, ai_providers):
    headers, _ = register_and_login(client)
    body = {**ONBOARDING, "experience_level": "beginner", "food_preferences": {"diet_type": "vegetarian"}}
    assert client.post(f"{API}/users/onboarding", headers=headers, json=body).status_code == 200
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    full = client.get(f"{API}/users/targets", headers=headers).json()["data"]["targets"]
    assert plan["targets"]["protein"] == round(full["protein"] * 0.8)
    assert plan["targets"]["calories"] == full["calories"]
    ramp = next(n for n in plan["notes"] if n["code"] == "protein_ramp")
    assert ramp["values"]["percent"] == 80
    assert plan["stale"] is False
    prompts = [c["prompt"] for c in ai_providers.calls if "Plan one day of meals" in c["prompt"]]
    assert prompts and "new to eating to a plan" in prompts[-1]


def test_an_intermediate_plan_has_no_ramp(client, ai_providers):
    headers, _ = register_and_login(client)
    assert client.post(f"{API}/users/onboarding", headers=headers, json=ONBOARDING).status_code == 200
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    full = client.get(f"{API}/users/targets", headers=headers).json()["data"]["targets"]
    assert plan["targets"]["protein"] == full["protein"]
    assert not [n for n in plan["notes"] if n["code"] == "protein_ramp"]


def test_moving_up_the_ramp_flags_the_plan(client, ai_providers, monkeypatch):
    headers, _ = register_and_login(client)
    body = {**ONBOARDING, "experience_level": "beginner", "food_preferences": {"diet_type": "vegetarian"}}
    client.post(f"{API}/users/onboarding", headers=headers, json=body)
    client.post(f"{API}/diet-plans", headers=headers)
    later = date.today() + timedelta(days=15)
    monkeypatch.setattr(svc, "local_today", lambda *a, **k: later)
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]["stale"] is True
