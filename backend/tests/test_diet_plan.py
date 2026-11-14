import asyncio
import json

import pytest

from app.nutrition import food_db, meal_planner
from app.nutrition.diet_rules import DietRules, food_tags, food_tokens, suitable_for_plans
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


def test_plan_without_ai_is_built_by_rules(client, ai_providers):
    headers, _ = _onboard(client)
    res = client.post(f"{API}/diet-plans", headers=headers)
    assert res.status_code == 200
    plan = res.json()["data"]
    assert "rule_based" in {n["code"] for n in plan["notes"]}
    assert [m["id"] for m in plan["meals"]] == ["breakfast", "lunch", "evening_snack", "dinner"]
    assert all(m["items"] for m in plan["meals"])
    targets = _targets(client, headers)
    assert plan["totals"]["kcal"] == pytest.approx(targets["calories"], rel=0.1)
    # Vegetarian with a peanut allergy: the rules still respect it.
    names = " ".join(i["name"].lower() for m in plan["meals"] for i in m["items"])
    assert not any(word in names for word in ("chicken", "egg", "fish", "peanut"))


def test_rule_based_plans_look_like_home_meals():
    prefs = {"diet_type": "vegetarian"}
    pool = meal_planner.food_pool(DietRules.from_preferences(prefs), prefs)
    slots = meal_planner.plan_slots({"meals_per_day": 4})
    for variant in range(4):
        pick = meal_planner.rule_based_pick(slots, pool, variant)
        meals = {m.slot: [food_db.get_food(i.food_id) for i in m.items] for m in pick.meals}
        lunch_grain = meals["lunch"][0]
        assert lunch_grain.id in meal_planner.PLAIN_GRAIN_IDS  # plain roti or rice
        assert meal_planner.food_role(meals["lunch"][1]) == "protein"
        for foods in meals.values():
            assert not any(meal_planner._avoided(f) for f in foods)
    # A new plan rotates the choices.
    first = meal_planner.rule_based_pick(slots, pool, 0)
    second = meal_planner.rule_based_pick(slots, pool, 1)
    assert first != second


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


def test_plan_with_missing_meals_is_rejected_then_built_by_rules(client, ai_providers):
    headers, _ = _onboard(client)
    only_lunch = _pick(lunch=[(DAL, 1)])
    ai_providers.gemini += [only_lunch] * 3
    res = client.post(f"{API}/diet-plans", headers=headers)
    assert res.status_code == 200
    plan = res.json()["data"]
    assert "rule_based" in {n["code"] for n in plan["notes"]}
    assert len(plan["meals"]) == 4


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
    # "mixed" when the plan added a hand-built staple (hung curd, paneer) to the dataset foods.
    assert data["meal"]["meal_type"] == "breakfast" and data["meal"]["source"] in ("verified", "mixed")
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


def test_overloaded_provider_is_retried_once(client, ai_providers, monkeypatch):
    from app.ai import client as ai_client

    monkeypatch.setattr(ai_client, "OVERLOAD_RETRY_SECONDS", 0)
    headers, _ = _onboard(client)
    ai_providers.gemini += [RuntimeError("503 UNAVAILABLE: high demand"), VALID_PICK]
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    assert "rule_based" not in {n["code"] for n in plan["notes"]}
    assert [c["provider"] for c in ai_providers.calls] == ["gemini", "gemini"]


# --- Daily routine around the workout -------------------------------------------
def test_morning_training_adds_a_pre_workout_snack_and_moves_breakfast_after():
    life = {"meals_per_day": 4, "wake_time": "06:30", "sleep_time": "23:00"}
    slots = {s["id"]: s for s in meal_planner.plan_slots(life, "early_morning", trains=True)}
    assert slots["pre_workout"]["time"] == "06:40" and slots["pre_workout"]["workout_role"] == "pre"
    assert slots["breakfast"]["time"] == "08:15" and slots["breakfast"]["workout_role"] == "post"
    assert sum(s["share"] for s in slots.values()) == pytest.approx(1, abs=0.01)


def test_evening_training_puts_the_snack_before_and_dinner_after():
    life = {"meals_per_day": 4, "wake_time": "07:00", "sleep_time": "23:30"}
    slots = {s["id"]: s for s in meal_planner.plan_slots(life, "evening", trains=True)}
    assert "pre_workout" not in slots
    assert slots["evening_snack"]["time"] == "17:30" and slots["evening_snack"]["workout_role"] == "pre"
    assert slots["dinner"]["workout_role"] == "post"


def test_no_workout_time_keeps_ordinary_meal_times():
    slots = meal_planner.plan_slots({"meals_per_day": 3}, None, trains=False)
    assert [s["id"] for s in slots] == ["breakfast", "lunch", "dinner"]
    assert not any("workout_role" in s for s in slots)


def test_routine_runs_from_waking_to_sleep():
    from app.nutrition import routine

    life = {"wake_time": "06:30", "sleep_time": "00:30"}
    meals = [{"id": "breakfast", "time": "08:00", "totals": {"kcal": 400}}]
    events = routine.daily_routine(meals, life, "morning", True, 2500)
    kinds = [e["kind"] for e in events]
    assert kinds == ["wake", "workout", "meal", "wind_down", "sleep"]
    assert events[0]["values"] == {"ml": routine.WAKE_WATER_ML, "liters": 2.5}
    assert events[-1]["time"] == "00:30" and events[-1]["values"]["hours"] == 6.0


def test_plan_includes_the_routine(client, ai_providers):
    payload = {**VEG_ONBOARDING, "workout_time": "early_morning", "workout_days_per_week": 4,
               "lifestyle": {"meals_per_day": 4, "wake_time": "06:00", "sleep_time": "22:30"}}
    headers, _ = _onboard(client, payload)
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    kinds = [e["kind"] for e in plan["routine"]]
    assert kinds[0] == "wake" and kinds[-1] == "sleep" and "workout" in kinds
    assert plan["meals"][0]["id"] == "pre_workout"


def test_a_logged_meal_cannot_be_swapped_or_replaced_today(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    client.post(f"{API}/diet-plans", headers=headers)
    client.post(f"{API}/diet-plans/current/meals/breakfast/log", headers=headers)

    swap = client.post(f"{API}/diet-plans/current/meals/breakfast/items/0/swap", headers=headers,
                       json={"food_id": RICE})
    assert swap.status_code == 400 and "already logged" in swap.json()["message"]
    regenerate = client.post(f"{API}/diet-plans/current/meals/breakfast/regenerate", headers=headers)
    assert regenerate.status_code == 400
    # Other meals can still be changed.
    options = client.get(f"{API}/diet-plans/current/meals/dinner/items/0/alternatives", headers=headers)
    assert options.status_code == 200



# --- Today's log over the plan ---------------------------------------------------
def test_a_hand_logged_breakfast_fills_the_plan_slot_and_rebalances_the_day(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    assert plan["today"]["day"]["state"] == "not_started"
    assert all(m["status"] == "planned" for m in plan["today"]["meals"].values())

    breakfast = next(m for m in plan["meals"] if m["id"] == "breakfast")
    big = round(breakfast["totals"]["kcal"] + 500)
    client.post(f"{API}/nutrition/meal", headers=headers, json={
        "name": "Aloo paratha with butter", "calories": big, "protein": 12, "carbs": 90, "fats": 40,
        "meal_type": "breakfast",
    })
    plan = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    today = plan["today"]
    assert today["meals"]["breakfast"]["status"] == "eaten"
    assert today["meals"]["breakfast"]["eaten"][0]["name"] == "Aloo paratha with butter"
    assert today["meals"]["breakfast"]["eaten_totals"]["calories"] == big
    # Ate more than planned: the rest of the day gets smaller portions.
    assert today["day"]["state"] == "ahead"
    assert today["day"]["eaten_kcal"] == big and today["day"]["meals_left"] == 3
    lunch = today["meals"]["lunch"]["adjust"]
    assert lunch["portion_percent"] < 100 and lunch["kcal_delta"] < 0
    assert plan["logged_today"] == []


def test_a_hand_logged_snack_goes_to_the_nearest_snack_slot():
    from app.nutrition import day_sync

    def meal(mid, mtype, time, kcal=300):
        return {"id": mid, "meal_type": mtype, "time": time, "items": [], "totals": {"kcal": kcal, "protein": 10}}

    meals = [meal("breakfast", "breakfast", "08:30"), meal("mid_morning", "snack", "11:00", 150),
             meal("lunch", "lunch", "13:30"), meal("evening_snack", "snack", "17:00", 150)]
    logs = [{"id": "a", "name": "Chai and biscuits", "calories": 150, "protein": 3, "meal_type": "snack",
             "time": "16:40"}]
    result = day_sync.sync_day(meals, [], {}, logs, {"calories": 900, "protein": 40})
    assert result["meals"]["evening_snack"]["status"] == "eaten"
    assert result["meals"]["mid_morning"]["status"] == "planned"
    # Eaten exactly what was planned there: no portion changes.
    assert result["day"]["state"] == "on_track"
    assert all(m["adjust"] is None for m in result["meals"].values())


def test_deleting_a_plan_log_opens_the_meal_again(client, ai_providers):
    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    client.post(f"{API}/diet-plans", headers=headers)
    meal_id = client.post(f"{API}/diet-plans/current/meals/breakfast/log", headers=headers).json()["data"]["meal"]["id"]
    plan = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    assert plan["logged_today"] == ["breakfast"]
    assert plan["today"]["meals"]["breakfast"]["status"] == "logged"
    # The plan's own log isn't counted again as a hand-logged meal.
    assert plan["today"]["meals"]["breakfast"]["eaten"] == []

    client.delete(f"{API}/nutrition/meal/{meal_id}", headers=headers)
    plan = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    assert plan["logged_today"] == []
    assert plan["today"]["meals"]["breakfast"]["status"] == "planned"
    assert client.post(f"{API}/diet-plans/current/meals/breakfast/log", headers=headers).status_code == 200


# --- Cooking fat notes -----------------------------------------------------------
def test_plan_items_say_how_much_cooking_fat_their_calories_assume(client, ai_providers):
    from app.nutrition import cooking_fat, grocery

    headers, _ = _onboard(client)
    ai_providers.gemini.append(VALID_PICK)
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    items = [item for meal in plan["meals"] for item in meal["items"]]
    assert all("cooking_fat" in item for item in items)
    with_fat = [item for item in items if item["cooking_fat"]]
    assert with_fat, "a mapped dish cooked in oil or ghee should carry a note"
    for item in with_fat:
        for fat in item["cooking_fat"]:
            assert fat["kind"] in cooking_fat.COOKING_FATS
            assert fat["tsp"] > 0 and fat["tsp"] * 4 == int(fat["tsp"] * 4)  # quarter-teaspoon steps
            per_100g = dict(grocery.ingredients_for(item["food_id"]))[fat["kind"]]
            assert fat["grams"] == pytest.approx(per_100g * item["grams"] / 100, abs=0.1)
    # A meal carries its total, and logging a meal never stores the note.
    assert any(meal["cooking_fat"] for meal in plan["meals"])
    logged = client.post(f"{API}/diet-plans/current/meals/lunch/log", headers=headers).json()["data"]["meal"]
    assert all("cooking_fat" not in item for item in logged["items"])


def test_tiny_or_unmapped_fat_gets_no_note():
    from app.nutrition import cooking_fat

    assert cooking_fat.for_item({"food_id": "not-mapped", "grams": 200}) == []
    assert cooking_fat.for_item({"food_id": "indb:ASC096", "grams": 10}) == []  # 0.1 g oil


def test_unmapped_cooked_dishes_get_an_estimated_oil_note():
    from app.nutrition import cooking_fat

    curry = {"food_id": "indb:ASC161", "name": "Black channa curry", "grams": 180,
             "per_100g": {"fat": 6.61}}
    [fat] = cooking_fat.for_item(curry)
    assert fat["kind"] == "oil" and fat["estimated"] is True
    assert fat["grams"] == pytest.approx((6.61 - cooking_fat.BASE_FAT_PER_100G) * 1.8, abs=0.1)
    assert fat["tsp"] == 2.0
    # Fat that comes from the food itself (paneer, nuts) or sweets isn't guessed at.
    for name in ("Paneer bhurji curry", "Kaju masala", "Moong dal halwa", "Soyabean curry"):
        assert cooking_fat.for_item({**curry, "name": name}) == []


def test_a_snack_with_no_plan_slot_is_kept_as_an_extra_with_its_time():
    from app.nutrition import day_sync

    meals = [{"id": "lunch", "meal_type": "lunch", "time": "13:30", "items": [], "totals": {"kcal": 600, "protein": 30}}]
    logs = [{"id": "bar", "name": "Protein bar", "calories": 200, "protein": 10, "meal_type": "snack",
             "eaten_at": None, "time": "16:20"}]
    result = day_sync.sync_day(meals, [], {}, logs, {"calories": 1800, "protein": 100})
    assert result["meals"]["lunch"]["status"] == "planned"
    [extra] = result["day"]["extras"]
    assert extra["name"] == "Protein bar" and extra["time"] == "16:20"
    assert result["day"]["eaten_protein"] == 10


# --- Protein on target -------------------------------------------------------------
PROTEIN_TARGETS = {"calories": 1895, "protein": 132, "carbs": 223, "fats": 53, "fiber": 27}


@pytest.mark.parametrize("diet", ["vegetarian", "eggetarian", "non_vegetarian", "jain", "vegan"])
def test_plans_reach_their_protein_target_without_breaking_calories(diet):
    rules = DietRules.from_preferences({"diet_type": diet})
    pool = meal_planner.food_pool(rules, {"diet_type": diet})
    foods = {f.id: f for f in pool}
    slots = meal_planner.plan_slots({"meals_per_day": 4, "sleep_time": "23:30"}, "early_morning", True)
    meals = meal_planner.assemble(meal_planner.rule_based_pick(slots, pool, 0), slots, foods)
    meal_planner.fit_portions(meals, PROTEIN_TARGETS, foods)
    before = sum(m["totals"]["protein"] for m in meals)
    meal_planner.boost_protein(meals, PROTEIN_TARGETS, pool, foods,
                               extra_slot=meal_planner.bedtime_slot({"sleep_time": "23:30"}))
    totals = {k: sum(m["totals"][k] for m in meals) for k in ("kcal", "protein", "fat")}
    assert totals["protein"] >= PROTEIN_TARGETS["protein"] * 0.88 > before
    assert abs(totals["kcal"] - PROTEIN_TARGETS["calories"]) <= PROTEIN_TARGETS["calories"] * meal_planner.MAX_KCAL_OVER - PROTEIN_TARGETS["calories"] + 1
    assert totals["fat"] <= PROTEIN_TARGETS["fats"] * meal_planner.MAX_FAT_OVER + 1
    for meal in meals:
        # Every addition fits the diet, and nothing doubles up in one meal (curd next to hung curd).
        assert all(rules.allows(foods[i["food_id"]]) for i in meal["items"])
        kinds = [food_tokens(foods[i["food_id"]]) & meal_planner.SAME_KIND_WORDS for i in meal["items"]]
        flat = [k for ks in kinds for k in ks]
        assert len(flat) == len(set(flat)), meal


def test_a_bedtime_protein_snack_closes_a_gap_the_meals_cannot():
    curd = food_db.get_food("est:hung_curd")
    rice = food_db.get_food(RICE)
    foods = {f.id: f for f in (curd, rice)}
    meals = [{"id": "lunch", "meal_type": "lunch", "time": "13:30", "share": 1.0,
              "items": [meal_planner.build_item(rice, 1.0)], "totals": {}}]
    targets = {"calories": 700, "protein": 40, "carbs": 120, "fats": 15, "fiber": 5}
    # Lunch is fixed (as when another meal is being regenerated), so the only way to add
    # protein is the snack before bed.
    meal_planner.boost_protein(meals, targets, [curd], foods, fixed=["lunch"],
                               extra_slot=meal_planner.bedtime_slot({"sleep_time": "23:00"}))
    bedtime = next(m for m in meals if m["id"] == "bedtime")
    assert bedtime["time"] == "22:00"
    assert [i["food_id"] for i in bedtime["items"]] == ["est:hung_curd"]


def test_a_plan_with_a_bedtime_snack_is_not_flagged_as_stale(client, ai_providers):
    headers, _ = _onboard(client, payload={**VEG_ONBOARDING, "lifestyle": {"meals_per_day": 4, "sleep_time": "23:30", "wake_time": "06:30"}})
    ai_providers.gemini.append(VALID_PICK)
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    protein = sum(m["totals"]["protein"] for m in plan["meals"])
    assert protein >= plan["targets"]["protein"] * 0.88
    assert plan["stale"] is False


# --- What suits each meal ----------------------------------------------------------
def test_nothing_heavy_goes_into_the_snack_before_a_workout():
    pre = {"id": "pre_workout", "workout_role": "pre"}
    evening_pre = {"id": "evening_snack", "workout_role": "pre"}
    raita = food_db.get_food("indb:ASC271")  # Sprouted moong raita
    banana = food_db.get_food(BANANA)
    for meal in (pre, evening_pre):
        assert not meal_planner.suits_meal(raita, meal)
        assert not meal_planner.suits_meal(food_db.get_food(CURD), meal)
        assert not meal_planner.suits_meal(food_db.get_food("est:roasted_chana"), meal)
        assert meal_planner.suits_meal(banana, meal)
    # The same raita is fine as an ordinary snack.
    assert meal_planner.suits_meal(raita, {"id": "evening_snack"})


def test_a_pre_workout_snack_left_empty_gets_a_banana():
    raita = food_db.get_food("indb:ASC271")
    banana = food_db.get_food(BANANA)
    foods = {raita.id: raita}
    meals = [{"id": "pre_workout", "workout_role": "pre", "items": [meal_planner.build_item(raita, 1.0)]}]
    assert meal_planner.enforce_meal_fit(meals, [raita, banana], foods) == 1
    assert [i["food_id"] for i in meals[0]["items"]] == [BANANA]


def test_no_tea_or_coffee_late_in_the_day():
    tea = next(m.food for m in food_db.search("tea", 5) if "tea" in food_tokens(m.food))
    assert not meal_planner.suits_meal(tea, {"id": "dinner"})
    assert not meal_planner.suits_meal(tea, {"id": "bedtime"})
    assert meal_planner.suits_meal(tea, {"id": "breakfast"})


def test_protein_is_never_added_before_a_workout():
    rules = DietRules.from_preferences({"diet_type": "vegetarian"})
    pool = meal_planner.food_pool(rules, {"diet_type": "vegetarian"})
    foods = {f.id: f for f in pool}
    slots = meal_planner.plan_slots({"meals_per_day": 4}, "early_morning", True)
    meals = meal_planner.assemble(meal_planner.rule_based_pick(slots, pool, 0), slots, foods)
    meal_planner.fit_portions(meals, PROTEIN_TARGETS, foods)
    before = [i["food_id"] for i in meals[0]["items"]]
    assert meals[0]["id"] == "pre_workout"
    meal_planner.boost_protein(meals, PROTEIN_TARGETS, pool, foods)
    assert [i["food_id"] for i in meals[0]["items"]] == before


def test_the_planner_prompt_keeps_the_pre_workout_snack_light():
    prompt = meal_planner.build_prompt(PROTEIN_TARGETS, meal_planner.plan_slots({"meals_per_day": 4}, "early_morning", True),
                                       [food_db.get_food(BANANA)], {}, {})
    assert "Except the snack before a workout" in prompt
    assert "No tea or coffee with dinner" in prompt


# --- Fat on target -------------------------------------------------------------------
@pytest.mark.parametrize("diet", ["vegetarian", "eggetarian", "non_vegetarian", "jain", "vegan"])
def test_fat_is_trimmed_without_losing_protein(diet):
    rules = DietRules.from_preferences({"diet_type": diet})
    pool = meal_planner.food_pool(rules, {"diet_type": diet})
    foods = {f.id: f for f in pool}
    for variant in range(3):
        slots = meal_planner.plan_slots({"meals_per_day": 4, "sleep_time": "23:30"}, "early_morning", True)
        meals = meal_planner.assemble(meal_planner.rule_based_pick(slots, pool, variant), slots, foods)
        meal_planner.fit_portions(meals, PROTEIN_TARGETS, foods)
        meal_planner.boost_protein(meals, PROTEIN_TARGETS, pool, foods,
                                   extra_slot=meal_planner.bedtime_slot({"sleep_time": "23:30"}))
        protein_before = sum(m["totals"]["protein"] for m in meals)
        meal_planner.trim_fat(meals, PROTEIN_TARGETS, pool, foods)
        totals = {k: sum(m["totals"][k] for m in meals) for k in ("kcal", "protein", "fat")}
        assert totals["fat"] <= PROTEIN_TARGETS["fats"] * 1.25
        assert totals["protein"] >= min(protein_before, PROTEIN_TARGETS["protein"] * 0.95) - 1
        assert abs(totals["kcal"] - PROTEIN_TARGETS["calories"]) <= PROTEIN_TARGETS["calories"] * 0.05
        for meal in meals:
            assert all(meal_planner.suits_meal(foods[i["food_id"]], meal) for i in meal["items"])


def test_a_fatty_dairy_side_is_swapped_for_a_leaner_one():
    rules = DietRules.from_preferences({"diet_type": "vegetarian"})
    pool = meal_planner.food_pool(rules, {"diet_type": "vegetarian"})
    foods = {f.id: f for f in pool}
    rich = food_db.get_food(CURD)  # whole-milk curd: hung curd or chaas are leaner dairy
    rice = food_db.get_food(RICE)
    foods[rice.id] = rice
    meals = [{"id": "lunch", "meal_type": "lunch", "time": "13:30", "share": 1.0,
              "items": [meal_planner.build_item(rice, 1.0), meal_planner.build_item(rich, 2.0)]}]
    targets = {"calories": round(sum(i["nutrients"]["kcal"] for i in meals[0]["items"])), "protein": 1,
               "carbs": 100, "fats": 5, "fiber": 5}
    fat_before = sum(i["nutrients"]["fat"] for i in meals[0]["items"])
    assert meal_planner.trim_fat(meals, targets, pool, foods) >= 1
    swapped = [foods[i["food_id"]] for i in meals[0]["items"] if i["food_id"] != rice.id]
    assert swapped and all(meal_planner.food_role(f) == "dairy" for f in swapped)
    assert sum(i["nutrients"]["fat"] for i in meals[0]["items"]) < fat_before
