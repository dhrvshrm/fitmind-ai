"""Meal plans follow the season where someone lives; taseer only when they ask for it."""
from datetime import date

import pytest

from app.nutrition import food_db, meal_planner, seasons
from app.nutrition.diet_rules import DietRules, food_tokens
from app.services import diet_plan_service
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"
JANUARY = date(2026, 1, 10)
MAY = date(2026, 5, 15)


@pytest.mark.parametrize(
    "region, zone",
    [
        ("Srinagar", "cold_hill"), ("Jammu and Kashmir", "cold_hill"), ("Leh, Ladakh", "cold_hill"),
        ("Jammu", "north"), ("New Delhi", "north"), ("Kochi, Kerala", "south"), ("Bengaluru", "south"),
        ("Pune", "west"), ("Kolkata", "east"), ("London", None), ("", None), (None, None),
    ],
)
def test_places_map_to_climate_zones(region, zone):
    assert seasons.zone_for(region) == zone


def test_seasons_follow_the_zone():
    assert seasons.season_for("cold_hill", JANUARY) == "winter"
    assert seasons.season_for("north", MAY) == "summer"
    assert seasons.season_for("west", date(2026, 7, 1)) == "monsoon"
    # The south has no real winter.
    assert seasons.season_for("south", JANUARY) == "mild"


def _names(produce):
    return {p.name for p in produce}


def test_a_kashmir_winter_has_haak_and_nadru_not_bhindi():
    ctx = seasons.context_for("Srinagar", JANUARY)
    assert {"Haak", "Nadru", "Shalgam", "Mooli"} <= _names(ctx.in_season)
    assert {"Bhindi", "Lauki", "Karela", "Aam", "Palak"} <= _names(ctx.out_of_season)
    # Frozen peas and stored apples are everywhere: never pushed back.
    assert not {"Matar", "Seb"} & _names(ctx.out_of_season)


def test_haak_is_only_seasonal_where_it_grows():
    delhi = seasons.context_for("Delhi", JANUARY)
    assert "Haak" not in _names(delhi.in_season) | _names(delhi.out_of_season)


def test_in_between_months_push_nothing_back():
    assert seasons.context_for("Kochi", JANUARY).out_of_season == ()


def _pool(region, when, taseer=False):
    ctx = seasons.context_for(region, when, taseer)
    return ctx, meal_planner.food_pool(DietRules.from_preferences({"diet_type": "vegetarian"}), {}, (), ctx)


def test_the_food_list_prefers_the_season_and_drops_what_is_out_of_it():
    ctx, pool = _pool("Srinagar", JANUARY)
    ids = [f.id for f in pool]
    assert "est:haak" in ids and "est:shalgam_sabzi" in ids
    assert not [f for f in pool if ctx.is_out_of_season(food_tokens(f))]
    # Summer in Delhi brings lauki and bhindi forward instead.
    ctx, pool = _pool("Delhi", MAY)
    assert {"est:lauki_sabzi", "indb:BFP269"} <= {f.id for f in pool}
    assert not [f for f in pool if ctx.is_out_of_season(food_tokens(f))]


def test_without_a_known_place_nothing_changes():
    plain = meal_planner.food_pool(DietRules.from_preferences({}), {})
    assert meal_planner.food_pool(DietRules.from_preferences({}), {}, (), None) == plain


def test_taseer_is_opt_in_and_pushes_cooling_food_back_in_winter():
    cucumber = food_db.get_food("usda:168409")
    off = seasons.context_for("Delhi", JANUARY)
    on = seasons.context_for("Delhi", JANUARY, follow_taseer=True)
    assert off.score(food_tokens(cucumber)) == 0
    assert on.score(food_tokens(cucumber)) < 0
    assert any("taseer" in line for line in on.prompt_lines())
    assert not any("taseer" in line for line in off.prompt_lines())


# --- Through the API ---------------------------------------------------------------
def _user(client, monkeypatch, region="Srinagar", when=JANUARY, follow_season=True):
    monkeypatch.setattr(diet_plan_service, "local_today", lambda *a, **k: when)
    headers, _ = register_and_login(client)
    prefs = {"diet_type": "vegetarian", "follow_season": follow_season}
    body = {**ONBOARDING, "food_preferences": prefs, "food_access": {"region": region}}
    assert client.post(f"{API}/users/onboarding", headers=headers, json=body).status_code == 200
    return headers


def test_a_kashmir_winter_plan_skips_summer_vegetables(client, ai_providers, monkeypatch):
    headers = _user(client, monkeypatch)
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    ctx = seasons.context_for("Srinagar", JANUARY)
    foods = [food_db.get_food(i["food_id"]) for m in plan["meals"] for i in m["items"] if i.get("food_id")]
    assert not [f.name for f in foods if f and ctx.is_out_of_season(food_tokens(f))]
    assert plan["season"]["season"] == "winter" and "Haak" in plan["season"]["in_season"]
    assert {"code": "season_tip", "values": {"season": "winter"}} in plan["notes"]
    assert plan["season_changed"] is False and plan["stale"] is False


def test_the_planner_is_told_the_season(client, ai_providers, monkeypatch):
    headers = _user(client, monkeypatch)
    client.post(f"{API}/diet-plans", headers=headers)
    prompts = [c["prompt"] for c in ai_providers.calls if "Plan one day of meals" in c["prompt"]]
    assert prompts and "winter where they live (Srinagar)" in prompts[-1]
    assert "bhindi" in prompts[-1]


def test_moving_or_a_new_season_flags_the_plan(client, ai_providers, monkeypatch):
    headers = _user(client, monkeypatch)
    client.post(f"{API}/diet-plans", headers=headers)
    client.put(f"{API}/users/personalisation", headers=headers, json={"food_access": {"region": "Chennai"}})
    plan = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    assert plan["season_changed"] is True and plan["stale"] is True


def test_turning_on_taseer_flags_the_plan(client, ai_providers, monkeypatch):
    headers = _user(client, monkeypatch, region="Delhi")
    client.post(f"{API}/diet-plans", headers=headers)
    client.put(f"{API}/users/personalisation", headers=headers, json={"food_preferences": {"follow_taseer": True}})
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]["stale"] is True


def test_season_endpoint(client, ai_providers, monkeypatch):
    headers = _user(client, monkeypatch)
    data = client.get(f"{API}/diet-plans/season", headers=headers).json()["data"]
    assert data["region"] == "Srinagar" and data["follow_taseer"] is False and data["follow_season"] is True
    assert data["season"]["zone"] == "cold_hill" and "Bhindi" in data["season"]["out_of_season"]

    client.put(f"{API}/users/personalisation", headers=headers, json={"food_access": {"region": "Paris"}})
    data = client.get(f"{API}/diet-plans/season", headers=headers).json()["data"]
    assert data["season"] is None and data["region"] == "Paris"


def test_seasonal_eating_is_off_unless_switched_on(client, ai_providers, monkeypatch):
    headers = _user(client, monkeypatch, follow_season=False)
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    assert plan["season"] is None
    assert not [n for n in plan["notes"] if n["code"] == "season_tip"]
    prompts = [c["prompt"] for c in ai_providers.calls if "Plan one day of meals" in c["prompt"]]
    assert prompts and "where they live" not in prompts[-1]
    # The card still shows what turning it on would do.
    data = client.get(f"{API}/diet-plans/season", headers=headers).json()["data"]
    assert data["follow_season"] is False and data["season"]["season"] == "winter"
    # Switching it on flags the plan for a new one.
    client.put(f"{API}/users/personalisation", headers=headers, json={"food_preferences": {"follow_season": True}})
    plan = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    assert plan["stale"] is True and plan["season"]["zone"] == "cold_hill"
