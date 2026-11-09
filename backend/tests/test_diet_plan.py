import asyncio
import json

import pytest

from app.nutrition import food_db, meal_planner
from app.nutrition.diet_rules import DietRules, food_tags, suitable_for_plans
from app.nutrition.food_db import Food, Nutrients, Serving
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"

POHA, CHAPATI, DAL, RICE = "indb:BFP044", "indb:ASC096", "indb:ASC155", "indb:ASC113"
RAJMA, PANEER, SPROUTS = "indb:ASC165", "indb:ASC226", "indb:ASC259"
CURD, BANANA, EGG, CHICKEN = "usda:171284", "usda:173944", "usda:173424", "usda:171477"

VEG_ONBOARDING = {
    **ONBOARDING,
    "food_preferences": {"diet_type": "vegetarian", "allergies": ["Peanuts"]},
    "lifestyle": {"meals_per_day": 4},
}


def _food(name, full_name=""):
    return Food(
        id=f"test:{name}", name=name, full_name=full_name, source="INDB",
        per_100g=Nutrients(kcal=100), serving=Serving(unit="bowl", grams=150),
    )


def _pick(**meals):
    return json.dumps({
        "meals": [
            {"slot": slot, "items": [{"food_id": f, "servings": s} for f, s in items]}
            for slot, items in meals.items()
        ]
    })


VALID_PICK = _pick(
    breakfast=[(POHA, 2), (CURD, 1)],
    lunch=[(CHAPATI, 3), (DAL, 1), (RICE, 0.5)],
    evening_snack=[(SPROUTS, 1), (BANANA, 1)],
    dinner=[(CHAPATI, 2), (RAJMA, 1), (PANEER, 1)],
)


def _onboard(client, payload=VEG_ONBOARDING, email="planner@example.com"):
    headers, user_id = register_and_login(client, email)
    client.post(f"{API}/users/onboarding", headers=headers, json=payload)
    return headers, user_id


def _targets(client, headers):
    return client.get(f"{API}/users/targets", headers=headers).json()["data"]["targets"]


# --- Diet rules ----------------------------------------------------------------
def test_diet_types_forbid_the_right_foods():
    veg = DietRules.from_preferences({"diet_type": "vegetarian"})
    egg_ok = DietRules.from_preferences({"diet_type": "eggetarian"})
    vegan = DietRules.from_preferences({"diet_type": "vegan"})
    jain = DietRules.from_preferences({"diet_type": "jain"})

    assert veg.violations(_food("Chicken curry")) == ["meat"]
    assert not veg.allows(_food("Anda bhurji"))
    assert egg_ok.allows(_food("Egg bhurji")) and not egg_ok.allows(_food("Fish fry"))
    assert not vegan.allows(_food("Kadhai paneer")) and vegan.allows(_food("Chana masala"))
    assert not jain.allows(_food("Aloo gobi")) and jain.allows(_food("Moong dal"))


def test_vegetarian_who_eats_eggs_is_offered_eggs():
    rules = DietRules.from_preferences({"diet_type": "vegetarian", "eats_eggs": True})
    assert rules.allows(_food("Boiled egg"))


def test_names_that_only_look_like_forbidden_foods_are_allowed():
    assert "egg" not in food_tags(_food("Eggless sponge"))
    assert "dairy" not in food_tags(_food("Peanut butter"))
    assert "dairy" not in food_tags(_food("Vegetable stew", "Vegetable stew with coconut milk"))
    assert "meat" not in food_tags(_food("Vegetarian nargisi kofta curry"))


def test_allergies_intolerances_and_dislikes_are_applied():
    rules = DietRules.from_preferences({
        "allergies": ["Peanuts", "tree nuts"],
        "intolerances": ["Lactose intolerance"],
        "dislikes": ["baingan"],
        "excluded": ["mushroom"],
    })
    assert rules.violations(_food("Peanut chikki")) == ["peanut"]
    assert not rules.allows(_food("Kaju katli"))
    assert not rules.allows(_food("Curd rice"))
    assert not rules.allows(_food("Brinjal bharta"))  # baingan = brinjal
    assert not rules.allows(_food("Mushroom masala"))
    # A tree-nut allergy alone doesn't rule out peanuts.
    assert DietRules.from_preferences({"allergies": ["tree nuts"]}).allows(_food("Peanut salad"))


def test_unknown_allergy_terms_still_exclude_matching_foods():
    rules = DietRules.from_preferences({"allergies": ["mustard"]})
    assert not rules.allows(_food("Mustard greens", "Sarson ka saag (mustard greens)"))


def test_sweets_and_condiments_are_not_plan_staples():
    assert not suitable_for_plans(_food("Gajar halwa"))
    assert not suitable_for_plans(_food("Mango pickle"))
    assert suitable_for_plans(_food("Besan cheela", "Gram flour pancake"))


def test_food_pool_contains_only_allowed_everyday_foods():
    prefs = {"diet_type": "vegetarian", "allergies": ["peanut"]}
    rules = DietRules.from_preferences(prefs)
    pool = meal_planner.food_pool(rules, prefs)
    ids = {f.id for f in pool}
    assert len(pool) == meal_planner.POOL_LIMIT
    assert {POHA, CHAPATI, DAL, CURD, BANANA} <= ids
    assert not ({EGG, CHICKEN, "usda:173806"} & ids)  # no egg, chicken or peanuts
    assert all(rules.allows(f) and suitable_for_plans(f) for f in pool)


# --- Slots and portions -----------------------------------------------------
def test_slots_follow_meal_count_and_routine():
    slots = meal_planner.plan_slots({"meals_per_day": 3, "wake_time": "06:00", "sleep_time": "22:30"})
    assert [s["id"] for s in slots] == ["breakfast", "lunch", "dinner"]
    assert slots[0]["time"] == "07:00"
    assert slots[2]["time"] == "20:00"
    assert sum(s["share"] for s in slots) == pytest.approx(1, abs=0.01)
    assert len(meal_planner.plan_slots(None)) == meal_planner.DEFAULT_MEAL_COUNT


def test_portions_are_fitted_to_the_calorie_target_in_sensible_steps():
    slots = meal_planner.plan_slots({"meals_per_day": 3})
    foods = {fid: food_db.get_food(fid) for fid in (POHA, CHAPATI, DAL, RICE, RAJMA)}
    pick = meal_planner.PlanPick.model_validate(json.loads(_pick(
        breakfast=[(POHA, 1)], lunch=[(CHAPATI, 1), (DAL, 1)], dinner=[(RICE, 0.5), (RAJMA, 1)],
    )))
    meals = meal_planner.assemble(pick, slots, foods)
    targets = {"calories": 1700, "protein": 60, "carbs": 250, "fats": 60, "fiber": 30}
    meal_planner.fit_portions(meals, targets, foods)

    total = sum(m["totals"]["kcal"] for m in meals)
    assert total == pytest.approx(1700, rel=0.07)
    for meal in meals:
        for item in meal["items"]:
            step = 1 if item["unit"] == "chapati" else 0.5
            assert item["quantity"] % step == 0
            assert item["quantity"] <= (6 if step == 1 else 3)
            assert item["grams"] <= meal_planner.MAX_ITEM_GRAMS
    # No meal ends up holding most of the day.
    assert max(m["totals"]["kcal"] for m in meals) < total * 0.5


def test_portions_stay_realistic_when_the_target_is_out_of_reach():
    slots = meal_planner.plan_slots({"meals_per_day": 2})
    foods = {fid: food_db.get_food(fid) for fid in (RICE, DAL)}
    pick = meal_planner.PlanPick.model_validate(json.loads(_pick(lunch=[(RICE, 1)], dinner=[(DAL, 1)])))
    meals = meal_planner.assemble(pick, slots, foods)
    meal_planner.fit_portions(meals, {"calories": 4000, "protein": 60, "carbs": 500, "fats": 90, "fiber": 30}, foods)
    assert all(i["grams"] <= meal_planner.MAX_ITEM_GRAMS for m in meals for i in m["items"])


# --- API ---------------------------------------------------------------------
def test_plan_needs_basic_profile_details(client, ai_providers):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/diet-plans", headers=headers)
    assert res.status_code == 400
    assert "profile" in res.json()["message"]


def test_plan_without_ai_reports_why(client, ai_providers):
    headers, _ = _onboard(client)
    res = client.post(f"{API}/diet-plans", headers=headers)
    assert res.status_code == 503
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"] is None


def test_create_plan_uses_database_numbers_and_fits_targets(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    res = client.post(f"{API}/diet-plans", headers=headers)
    assert res.status_code == 200, res.json()
    plan = res.json()["data"]
    targets = _targets(client, headers)

    assert plan["version"] == 1 and plan["change"] == "created"
    assert [m["id"] for m in plan["meals"]] == ["breakfast", "lunch", "evening_snack", "dinner"]
    assert plan["totals"]["kcal"] == pytest.approx(targets["calories"], rel=0.07)
    chapati = next(i for i in plan["meals"][1]["items"] if i["food_id"] == CHAPATI)
    per_100g = food_db.get_food(CHAPATI).per_100g
    assert chapati["nutrients"]["kcal"] == pytest.approx(per_100g.kcal * chapati["grams"] / 100, abs=0.2)
    assert {n["code"] for n in plan["notes"]} >= {"check_ingredients"}
    assert plan["stale"] is False and plan["logged_today"] == []

    # The prompt carried the targets and only allowed foods.
    prompt = ai_providers.calls[0]["prompt"]
    assert f"{targets['calories']} kcal" in prompt
    assert CHICKEN not in prompt and "usda:173806" not in prompt


def test_foods_outside_the_allowed_list_are_rejected_and_asked_again(client, ai_providers):
    headers, _ = _onboard(client)
    with_chicken = _pick(
        breakfast=[(POHA, 1)], lunch=[(CHICKEN, 1), (CHAPATI, 2)],
        evening_snack=[(BANANA, 1)], dinner=[(DAL, 1), (RICE, 1)],
    )
    ai_providers.gemini += [with_chicken, VALID_PICK]
    res = client.post(f"{API}/diet-plans", headers=headers)
    assert res.status_code == 200
    ids = {i["food_id"] for m in res.json()["data"]["meals"] for i in m["items"]}
    assert CHICKEN not in ids
    assert "not in the list" in ai_providers.calls[1]["prompt"]


def test_plan_with_missing_meals_is_rejected(client, ai_providers):
    headers, _ = _onboard(client)
    only_lunch = _pick(lunch=[(DAL, 1)])
    ai_providers.gemini += [only_lunch] * 3
    assert client.post(f"{API}/diet-plans", headers=headers).status_code == 503


def test_regenerating_one_meal_keeps_the_rest_and_versions_the_plan(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    first = client.post(f"{API}/diet-plans", headers=headers).json()["data"]

    ai_providers.gemini.append(_pick(dinner=[(RICE, 1), (DAL, 1), (CURD, 1)]))
    res = client.post(f"{API}/diet-plans/current/meals/dinner/regenerate", headers=headers)
    assert res.status_code == 200
    plan = res.json()["data"]
    assert plan["version"] == 2 and plan["change"] == "meal_regenerated"
    assert plan["meals"][:3] == first["meals"][:3]
    assert {i["food_id"] for i in plan["meals"][3]["items"]} == {RICE, DAL, CURD}
    assert "Don't repeat those dishes" in ai_providers.calls[-1]["prompt"]


def test_a_different_option_that_repeats_the_old_meal_is_asked_again(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    client.post(f"{API}/diet-plans", headers=headers)

    same_again = _pick(dinner=[(CHAPATI, 2), (RAJMA, 1), (PANEER, 1), (CURD, 1)])
    ai_providers.gemini += [same_again, _pick(dinner=[(CHAPATI, 2), (DAL, 1), (CURD, 1)])]
    plan = client.post(f"{API}/diet-plans/current/meals/dinner/regenerate", headers=headers).json()["data"]
    assert {i["food_id"] for i in plan["meals"][3]["items"]} == {CHAPATI, DAL, CURD}
    # The old dinner's dishes weren't offered, except its grain (chapati).
    prompt = ai_providers.calls[-2]["prompt"]
    assert f"{CHAPATI} |" in prompt and f"{RAJMA} |" not in prompt and f"{PANEER} |" not in prompt
    assert "not in the list" in ai_providers.calls[-1]["prompt"]


def test_swapping_a_food_offers_allowed_options_of_similar_calories(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    original = plan["meals"][3]["items"][1]  # rajma

    options = client.get(
        f"{API}/diet-plans/current/meals/dinner/items/1/alternatives", headers=headers
    ).json()["data"]
    assert options
    dinner_ids = {i["food_id"] for i in plan["meals"][3]["items"]}
    assert not dinner_ids & {o["food_id"] for o in options}
    assert all("meat" not in food_tags(food_db.get_food(o["food_id"])) for o in options)
    # Rajma is swapped for other protein dishes, not rice or fruit.
    assert all(meal_planner.food_role(food_db.get_food(o["food_id"])) == "protein" for o in options)

    searched = client.get(
        f"{API}/diet-plans/current/meals/dinner/items/1/alternatives?q=chole", headers=headers
    ).json()["data"]
    assert any("chickpea" in o["name"].lower() for o in searched)

    choice = options[0]
    res = client.post(
        f"{API}/diet-plans/current/meals/dinner/items/1/swap", headers=headers,
        json={"food_id": choice["food_id"]},
    )
    assert res.status_code == 200
    swapped = res.json()["data"]
    assert swapped["version"] == 2 and swapped["change"] == "item_swapped"
    new_item = swapped["meals"][3]["items"][1]
    assert new_item["food_id"] == choice["food_id"]
    assert new_item["nutrients"]["kcal"] == pytest.approx(original["nutrients"]["kcal"], rel=0.6)

    forbidden = client.post(
        f"{API}/diet-plans/current/meals/dinner/items/1/swap", headers=headers,
        json={"food_id": CHICKEN},
    )
    assert forbidden.status_code == 400


def test_logging_a_planned_meal_saves_it_once_per_day(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]

    res = client.post(f"{API}/diet-plans/current/meals/breakfast/log", headers=headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["plan"]["logged_today"] == ["breakfast"]
    assert data["meal"]["meal_type"] == "breakfast" and data["meal"]["source"] == "verified"
    assert data["meal"]["calories"] == pytest.approx(plan["meals"][0]["totals"]["kcal"])

    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    assert len(today["meals"]) == 1
    again = client.post(f"{API}/diet-plans/current/meals/breakfast/log", headers=headers)
    assert again.status_code == 400
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]["logged_today"] == ["breakfast"]


def test_plan_is_flagged_when_targets_or_diet_change(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    client.post(f"{API}/diet-plans", headers=headers)

    client.put(f"{API}/users/profile", headers=headers, json={"weight_kg": 85})
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]["stale"] is True


def test_plan_is_flagged_when_allergies_change(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    client.post(f"{API}/diet-plans", headers=headers)
    client.put(
        f"{API}/users/personalisation", headers=headers,
        json={"food_preferences": {"allergies": ["Peanuts", "milk"]}},
    )
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]["stale"] is True


def test_missing_plan_meal_and_item_return_404(client, ai_providers):
    headers, _ = _onboard(client)
    assert client.post(f"{API}/diet-plans/current/meals/lunch/log", headers=headers).status_code == 404
    ai_providers.gemini.append(VALID_PICK)
    client.post(f"{API}/diet-plans", headers=headers)
    assert client.post(f"{API}/diet-plans/current/meals/brunch/log", headers=headers).status_code == 404
    res = client.get(f"{API}/diet-plans/current/meals/lunch/items/9/alternatives", headers=headers)
    assert res.status_code == 404


def test_deleting_the_account_removes_plans(client, ai_providers, mock_db):
    headers, user_id = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    client.post(f"{API}/diet-plans", headers=headers)
    assert asyncio.run(mock_db["diet_plans"].count_documents({"user_id": user_id})) == 1
    client.delete(f"{API}/settings/account", headers=headers)
    assert asyncio.run(mock_db["diet_plans"].count_documents({"user_id": user_id})) == 0
