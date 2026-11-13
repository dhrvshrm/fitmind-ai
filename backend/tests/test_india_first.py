"""Phase 8: fasting and festival modes, grocery list from the plan, shift-aware meal times."""
from datetime import timedelta

import pytest

from app.nutrition import fasting, food_db, grocery, meal_planner, routine
from app.nutrition.diet_rules import DietRules
from app.nutrition.food_db import Food, Nutrients, Serving
from app.utils.time import local_today
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"

VEG = {**ONBOARDING, "food_preferences": {"diet_type": "vegetarian"}, "lifestyle": {"meals_per_day": 4}}


def _food(name):
    return Food(
        id=f"test:{name}", name=name, source="INDB",
        per_100g=Nutrients(kcal=100), serving=Serving(unit="bowl", grams=150),
    )


def _onboard(client, payload=VEG, email="india@example.com"):
    headers, user_id = register_and_login(client, email)
    client.post(f"{API}/users/onboarding", headers=headers, json=payload)
    return headers, user_id


def _add_mode(client, headers, mode, days_from_today=0, **extra):
    start = local_today() + timedelta(days=days_from_today)
    body = {"mode": mode, "start_date": start.isoformat(), **extra}
    return client.post(f"{API}/diet-plans/fasting-modes", headers=headers, json=body)


# --- Mode food rules -----------------------------------------------------------
def test_navratri_allows_vrat_foods_and_excludes_grains_pulses_onion_and_eggs():
    rules = DietRules.from_preferences({}).with_fasting_mode("navratri")
    for allowed in ("Sago khitchdi", "Kuttu roti", "Samak rice khichdi", "Singhara roti",
                    "Dry potato", "Cucumber raita", "Roasted makhana", "Banana", "Paneer curry"):
        assert rules.allows(_food(allowed)), allowed
    for excluded in ("Chapati", "Boiled rice", "Mixed dal", "Chickpeas curry", "Onion raita",
                     "Egg curry", "Chicken curry", "Poha", "Pea potato curry", "Tomato"):
        assert not rules.allows(_food(excluded)), excluded


def test_paryushan_follows_jain_rules_and_ramadan_keeps_normal_foods():
    paryushan = DietRules.from_preferences({}).with_fasting_mode("paryushan")
    assert paryushan.allows(_food("Moong dal")) and paryushan.allows(_food("Chapati"))
    for excluded in ("Aloo gobi", "Onion raita", "Garlic naan", "Carrot halwa", "Egg curry", "Honey lemon"):
        assert not paryushan.allows(_food(excluded)), excluded

    ramadan = DietRules.from_preferences({}).with_fasting_mode("ramadan")
    assert ramadan.allows(_food("Chicken curry")) and ramadan.allows(_food("Chapati"))


def test_mode_rules_add_to_the_persons_own_rules():
    rules = DietRules.from_preferences({"allergies": ["peanuts"]}).with_fasting_mode("navratri")
    assert not rules.allows(_food("Peanut raita"))
    assert DietRules.from_preferences({}).with_fasting_mode(None).fasting_mode is None


def test_fasting_dishes_missing_from_indb_are_labelled_estimates():
    kuttu = food_db.get_food("est:kuttu_roti")
    assert kuttu is not None and kuttu.source == "estimate"
    item = meal_planner.build_item(kuttu, 2)
    assert item["source"] == "estimate" and item["verified"] is False
    # INDB foods keep their verified label.
    assert meal_planner.build_item(food_db.get_food("indb:OSR099"), 1)["verified"] is True
    # Found by the names people use.
    assert food_db.search("sabudana khichdi", limit=1)[0].food.id == "indb:OSR099"
    assert food_db.search("samak rice", limit=1)[0].food.id.startswith("est:samak")


def test_estimates_found_while_logging_are_not_marked_verified():
    from app.nutrition.estimator import from_food
    from app.nutrition.parser import ParsedItem

    food = food_db.get_food("est:singhara_roti")
    item = from_food(ParsedItem(name="singhara roti", quantity=2), food, 0.97, [])
    assert item.source == "estimate" and item.verified is False


# --- Fallback plans honour modes -----------------------------------------------
@pytest.mark.parametrize("mode", ["navratri", "ekadashi", "paryushan"])
def test_rule_based_plans_only_use_foods_the_mode_allows(mode):
    rules = DietRules.from_preferences({"diet_type": "vegetarian"}).with_fasting_mode(mode)
    pool = meal_planner.food_pool(rules, {})
    assert pool and all(rules.allows(f) for f in pool)
    slots = meal_planner.plan_slots({"meals_per_day": 5})
    for variant in range(4):
        pick = meal_planner.rule_based_pick(slots, pool, variant, mode)
        foods = {f.id: f for f in pool}
        assert [m.slot for m in pick.meals] == [s["id"] for s in slots]
        assert all(rules.allows(foods[i.food_id]) for m in pick.meals for i in m.items)


def test_navratri_fallback_meals_are_built_on_fasting_staples():
    rules = DietRules.from_preferences({}).with_fasting_mode("navratri")
    pool = meal_planner.food_pool(rules, {})
    foods = {f.id: f for f in pool}
    pick = meal_planner.rule_based_pick(meal_planner.plan_slots({"meals_per_day": 3}), pool, 0, "navratri")
    lunch = next(m for m in pick.meals if m.slot == "lunch")
    names = " ".join(foods[i.food_id].name.lower() for i in lunch.items)
    assert any(word in names for word in ("kuttu", "samak", "singhara", "rajgira", "sago", "buckwheat"))


# --- Ramadan timings -----------------------------------------------------------
def test_ramadan_gives_sehri_iftar_and_a_late_meal_and_nothing_in_daytime():
    mode = {"mode": "ramadan", "dawn_time": "05:10", "sunset_time": "18:20"}
    slots = meal_planner.plan_slots({"meals_per_day": 5, "sleep_time": "23:30"}, "evening", True, mode)
    assert [s["id"] for s in slots] == ["sehri", "iftar", "post_iftar"]
    times = {s["id"]: s["time"] for s in slots}
    assert times == {"sehri": "04:25", "iftar": "18:20", "post_iftar": "20:50"}
    assert sum(s["share"] for s in slots) == pytest.approx(1, abs=0.01)
    assert slots[2]["workout_role"] == "post"


def test_ramadan_routine_starts_before_dawn_and_marks_the_fast():
    mode = {"mode": "ramadan", "dawn_time": "05:00", "sunset_time": "18:30"}
    meals = [{"id": s["id"], "time": s["time"], "totals": {"kcal": 500}}
             for s in meal_planner.plan_slots({"sleep_time": "23:00"}, None, False, mode)]
    events = routine.daily_routine(meals, {"sleep_time": "23:00"}, None, False, 2500, mode)
    kinds = [e["kind"] for e in events]
    assert kinds == ["wake", "meal", "fast_begins", "meal", "meal", "wind_down", "sleep"]
    assert events[0]["time"] == "03:45" and events[2]["time"] == "05:00"


# --- Modes through the API -------------------------------------------------------
def test_modes_are_date_bound_and_cannot_overlap(client):
    headers, _ = _onboard(client)
    listed = client.get(f"{API}/diet-plans/fasting-modes", headers=headers).json()["data"]
    assert {m["key"] for m in listed["catalogue"]} == {"navratri", "ekadashi", "paryushan", "ramadan"}
    assert listed["active"] is None

    created = _add_mode(client, headers, "navratri").json()["data"]
    assert created["status"] == "active"
    end = (local_today() + timedelta(days=8)).isoformat()
    assert created["end_date"] == end  # nine days by default

    assert _add_mode(client, headers, "ekadashi", 3).status_code == 400  # overlaps
    too_long = _add_mode(client, headers, "ekadashi", 20, end_date=(local_today() + timedelta(days=21)).isoformat())
    assert too_long.status_code == 400  # Ekadashi is one day
    past = client.post(f"{API}/diet-plans/fasting-modes", headers=headers, json={
        "mode": "paryushan", "start_date": (local_today() - timedelta(days=30)).isoformat(),
        "end_date": (local_today() - timedelta(days=25)).isoformat(),
    })
    assert past.status_code == 400
    bad_times = _add_mode(client, headers, "navratri", 40, dawn_time="05:00")
    assert bad_times.status_code == 422

    removed = client.delete(f"{API}/diet-plans/fasting-modes/{created['id']}", headers=headers)
    assert removed.status_code == 200
    assert client.get(f"{API}/diet-plans/fasting-modes", headers=headers).json()["data"]["active"] is None


def test_plan_made_in_navratri_follows_the_fast_and_says_so(client, ai_providers):
    headers, _ = _onboard(client)
    _add_mode(client, headers, "navratri")
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]  # AI fails: rules
    assert plan["fasting_mode"]["mode"] == "navratri" and plan["mode_changed"] is False
    codes = {n["code"] for n in plan["notes"]}
    assert {"fasting_mode", "fasting_salt", "check_ingredients", "rule_based"} <= codes
    rules = DietRules.from_preferences({}).with_fasting_mode("navratri")
    for meal in plan["meals"]:
        for item in meal["items"]:
            assert rules.allows(food_db.get_food(item["food_id"])), item["name"]


def test_ai_prompt_carries_the_mode_and_the_pool_follows_it(client, ai_providers):
    headers, _ = _onboard(client)
    _add_mode(client, headers, "navratri")
    client.post(f"{API}/diet-plans", headers=headers)
    prompt = ai_providers.calls[-1]["prompt"] if ai_providers.calls else ""
    assert "Navratri fast" in prompt
    assert "indb:ASC096" not in prompt  # no chapati on offer


def test_ramadan_plan_uses_the_users_dawn_and_sunset(client, ai_providers):
    headers, _ = _onboard(client)
    _add_mode(client, headers, "ramadan", dawn_time="04:55", sunset_time="18:05")
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    assert [m["id"] for m in plan["meals"]] == ["sehri", "iftar", "post_iftar"]
    assert plan["meals"][1]["time"] == "18:05"
    note = next(n for n in plan["notes"] if n["code"] == "ramadan_timings")
    assert note["values"]["given"] is True
    assert "fast_begins" in [e["kind"] for e in plan["routine"]]


def test_plan_is_flagged_when_a_mode_starts_after_it_was_made(client, ai_providers):
    headers, _ = _onboard(client)
    client.post(f"{API}/diet-plans", headers=headers)
    _add_mode(client, headers, "ekadashi")
    plan = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    assert plan["mode_changed"] is True and plan["stale"] is True
    assert plan["active_fasting_mode"]["mode"] == "ekadashi"


def test_logging_a_food_that_breaks_the_fast_warns_but_still_logs(client):
    headers, _ = _onboard(client)
    _add_mode(client, headers, "navratri")
    meal = {"name": "Dal and rice", "calories": 450, "protein": 15, "meal_type": "lunch",
            "items": [{"name": "Mixed dal", "food_id": "indb:ASC155", "source": "INDB", "verified": True,
                       "nutrients": {"kcal": 200}},
                      {"name": "Sago khitchdi", "food_id": "indb:OSR099", "source": "INDB", "verified": True,
                       "nutrients": {"kcal": 250}}]}
    res = client.post(f"{API}/nutrition/meal", headers=headers, json=meal)
    assert res.status_code == 200
    warning = res.json()["data"]["fasting_warning"]
    assert warning["mode"] == "navratri" and warning["foods"] == ["Mixed dal"]

    ok = client.post(f"{API}/nutrition/meal", headers=headers, json={"name": "Banana", "calories": 100})
    assert ok.json()["data"]["fasting_warning"] is None

    batch = client.post(f"{API}/nutrition/meals/batch", headers=headers, json={"meals": [
        {"name": "Egg bhurji", "calories": 250}, {"name": "Lassi", "calories": 150},
    ]})
    assert batch.json()["data"]["fasting_warning"]["foods"] == ["Egg bhurji"]


def test_ramadan_never_warns_on_food(client):
    headers, _ = _onboard(client)
    _add_mode(client, headers, "ramadan")
    res = client.post(f"{API}/nutrition/meal", headers=headers, json={"name": "Chicken biryani", "calories": 600})
    assert res.json()["data"]["fasting_warning"] is None


def test_deleting_the_account_removes_fasting_modes(client, mock_db):
    import asyncio

    headers, user_id = _onboard(client)
    _add_mode(client, headers, "navratri")
    assert client.delete(f"{API}/settings/account", headers=headers).status_code == 200
    assert asyncio.run(mock_db["fasting_modes"].count_documents({"user_id": user_id})) == 0


# --- Grocery list ------------------------------------------------------------------
def _meal(*items):
    return {"id": "lunch", "items": [
        {"food_id": fid, "name": name, "grams": grams, "quantity": qty, "unit": unit}
        for fid, name, grams, qty, unit in items
    ]}


def test_grocery_list_combines_dishes_into_ingredients_by_aisle():
    meals = [
        _meal(("indb:ASC096", "Chapati", 120, 3, "roti"), ("indb:ASC162", "Chickpeas curry", 150, 1, "bowl")),
        {"id": "dinner", "items": [
            {"food_id": "indb:ASC096", "name": "Chapati", "grams": 80, "quantity": 2, "unit": "roti"},
            {"food_id": "usda:173944", "name": "Banana", "grams": 118, "quantity": 1, "unit": "piece"},
        ]},
    ]
    result = grocery.build_list(meals, days=7)
    aisles = {a["aisle"]: {i["key"]: i for i in a["items"]} for a in result["aisles"]}
    # 200 g chapati a day x 7 days x 72 g atta per 100 g = 1008 g -> about a kilo.
    assert aisles["grains_flours"]["atta"]["amount"] == 1.1 and aisles["grains_flours"]["atta"]["unit"] == "kg"
    # Chickpeas: 150 g x 7 x 22% = 231 g -> 250 g.
    assert aisles["pulses"]["kabuli_chana"] == {**aisles["pulses"]["kabuli_chana"], "amount": 250, "unit": "g"}
    assert aisles["fruits"]["banana"]["amount"] == 7 and aisles["fruits"]["banana"]["unit"] == "piece"
    assert aisles["vegetables"]["onion"]["dishes"] == ["Chickpeas curry"]
    assert aisles["spices_others"]["spices"]["amount"] is None
    assert result["unmapped_count"] == 0
    order = [a["aisle"] for a in result["aisles"]]
    assert order == [a for a in grocery.AISLES if a in order]


def test_grocery_list_follows_the_plans_fast():
    meals = [_meal(
        ("indb:ASC162", "Chickpeas curry", 150, 1, "bowl"),  # has onion
        ("est:rajgira_roti", "Rajgira roti", 100, 2, "roti"),
        ("indb:BFP044", "Aloo dish", 150, 1, "bowl"),  # has potato
    )]
    keys = lambda result: {i["key"] for a in result["aisles"] for i in a["items"]}  # noqa: E731
    plain = grocery.build_list(meals, days=3)
    assert {"onion", "rajgira_atta", "potato"} <= keys(plain) and plain["left_out"] == []

    navratri = grocery.build_list(meals, days=3, mode=fasting.get_mode("navratri"))
    assert "onion" not in keys(navratri) and "Onions" in " ".join(navratri["left_out"])
    # A fasting flour stays, even though "atta" is also a grain word.
    assert {"rajgira_atta", "potato"} <= keys(navratri)

    # Paryushan: no root vegetables.
    paryushan = grocery.build_list(meals, days=3, mode=fasting.get_mode("paryushan"))
    assert "potato" not in keys(paryushan) and "onion" not in keys(paryushan)


def test_unmapped_dishes_are_listed_as_ready_made():
    result = grocery.build_list([_meal(("indb:OSR076", "Gobi 65", 100, 1, "bowl"))], days=3)
    ready = result["aisles"][-1]
    assert ready["aisle"] == "ready_made" and result["unmapped_count"] == 1
    assert ready["items"][0]["servings"] == 3 and ready["items"][0]["grams"] == 300


def test_household_amounts_round_up_to_what_people_buy():
    assert grocery.household_amount(12, "g") == {"amount": 15, "unit": "g"}
    assert grocery.household_amount(231, "g") == {"amount": 250, "unit": "g"}
    assert grocery.household_amount(1890, "ml") == {"amount": 1.9, "unit": "l"}
    assert grocery.household_amount(2.3, "piece") == {"amount": 3, "unit": "piece"}
    assert grocery.household_amount(5, None) == {"amount": None, "unit": None}


def test_common_planner_dishes_are_mapped():
    rules = DietRules.from_preferences({"diet_type": "vegetarian"})
    pool = meal_planner.food_pool(rules, {})
    slots = meal_planner.plan_slots({"meals_per_day": 5})
    picked = {i.food_id for v in range(6) for m in meal_planner.rule_based_pick(slots, pool, v).meals for i in m.items}
    mapped = {fid for fid in picked if grocery.ingredients_for(fid)}
    assert len(mapped) / len(picked) >= 0.9


def test_grocery_list_endpoint(client, ai_providers):
    headers, _ = _onboard(client)
    assert client.post(f"{API}/diet-plans", headers=headers).status_code == 200
    res = client.get(f"{API}/diet-plans/current/grocery-list?days=3", headers=headers)
    data = res.json()["data"]
    assert res.status_code == 200 and data["days"] == 3 and data["aisles"]
    assert client.get(f"{API}/diet-plans/current/grocery-list?days=30", headers=headers).status_code == 422


# --- Shift-aware meal times ----------------------------------------------------------
def test_night_shift_meal_times_follow_wake_and_sleep():
    life = {"work_schedule": "night_shift", "wake_time": "15:00", "sleep_time": "07:00", "meals_per_day": 4}
    slots = meal_planner.plan_slots(life)
    assert [s["id"] for s in slots] == ["breakfast", "lunch", "evening_snack", "dinner"]
    times = {s["id"]: s["time"] for s in slots}
    assert times["breakfast"] == "16:00"
    assert times["dinner"] == "04:30"  # two and a half hours before sleep
    assert "22:15" <= times["lunch"] <= "22:30"


def test_shift_workout_shapes_meals_relative_to_waking():
    life = {"work_schedule": "night_shift", "wake_time": "13:00", "sleep_time": "05:00", "meals_per_day": 4}
    slots = {s["id"]: s for s in meal_planner.plan_slots(life, "evening", trains=True)}
    assert slots["pre_workout"]["workout_role"] == "pre"
    post = [s for s in slots.values() if s.get("workout_role") == "post"]
    assert post and post[0]["time"] >= "19:45"
    # A workout that would fall while they sleep is left out.
    assert routine.workout_window(life, "early_morning", True) is None


def test_day_schedules_keep_their_usual_times():
    life = {"work_schedule": "rotating_shifts", "meals_per_day": 3}  # no times given yet
    assert [s["time"] for s in meal_planner.plan_slots(life)] == ["08:30", "13:30", "20:30"]
    assert not routine.is_shift_schedule({"work_schedule": "day", "wake_time": "06:30", "sleep_time": "22:30"})
    assert routine.is_shift_schedule({"wake_time": "14:00"})


def test_wake_and_sleep_times_are_validated(client):
    headers, _ = _onboard(client)
    bad = client.put(f"{API}/users/personalisation", headers=headers,
                     json={"lifestyle": {"wake_time": "07:00", "sleep_time": "06:00"}})
    assert bad.status_code == 422  # one hour of sleep
    good = client.put(f"{API}/users/personalisation", headers=headers, json={
        "lifestyle": {"work_schedule": "night_shift", "wake_time": "15:00", "sleep_time": "07:00"},
    })
    assert good.status_code == 200


def test_plan_times_follow_a_new_shift_without_changing_foods(client, ai_providers):
    headers, _ = _onboard(client)
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    client.put(f"{API}/users/personalisation", headers=headers, json={
        "lifestyle": {"work_schedule": "night_shift", "wake_time": "15:00", "sleep_time": "07:00"},
    })
    after = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    assert after["shift_aware"] is True and after["version"] == plan["version"]
    breakfast = next(m for m in after["meals"] if m["id"] == "breakfast")
    assert breakfast["time"] == "16:00"
    assert breakfast["items"] == next(m for m in plan["meals"] if m["id"] == "breakfast")["items"]
    assert after["routine"][0] == {**after["routine"][0], "kind": "wake", "time": "15:00"}
