"""PG and hostel mess mode: mess meals plus no-cook shelf foods."""
from app.nutrition import food_db, mess
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"

# A student in a PG: the mess serves all three meals, volleyball at dawn, and a
# shelf of milk, brown bread, peanut butter, dates and almonds.
STUDENT = {
    **ONBOARDING,
    "age": 20,
    "weight_kg": 58,
    "height_cm": 174,
    "fitness_goal": "muscle_gain",
    "experience_level": "beginner",
    "workout_time": "early_morning",
    "workout_days_per_week": 6,
    "food_preferences": {"diet_type": "vegetarian"},
    "lifestyle": {"meals_per_day": 4, "wake_time": "05:30", "sleep_time": "23:00"},
}
SHELF = ["milk", "brown_bread", "peanut_butter", "dates", "almonds"]


def _student(client, email="pg@example.com", shelf=SHELF, diet="vegetarian"):
    headers, user_id = register_and_login(client, email)
    client.post(f"{API}/users/onboarding", headers=headers,
                json={**STUDENT, "food_preferences": {"diet_type": diet}})
    res = client.put(f"{API}/users/personalisation", headers=headers, json={
        "food_access": {"who_cooks": "mess_or_canteen", "mess_meals": ["breakfast", "lunch", "dinner"],
                        "shelf": shelf},
    })
    assert res.status_code == 200, res.text
    return headers, user_id


def _plan(client, headers):
    res = client.post(f"{API}/diet-plans", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]


def test_mess_meals_come_from_the_mess_and_the_rest_from_the_shelf(client, ai_providers):
    headers, _ = _student(client)
    plan = _plan(client, headers)
    assert ai_providers.calls == []  # no AI needed to fill a shelf
    by_id = {m["id"]: m for m in plan["meals"]}
    for slot in ("breakfast", "lunch", "dinner"):
        assert by_id[slot]["source"] == "mess"
    shelf_ids = {mess.SHELF[k].food_id for k in SHELF}
    shelf_meals = [m for m in plan["meals"] if m["source"] == "shelf"]
    assert shelf_meals
    for meal in shelf_meals:
        assert {i["food_id"] for i in meal["items"]} <= shelf_ids, meal
        assert meal["cost_inr"] > 0 and all(i["cost_inr"] for i in meal["items"])
    # Dates (light carbs) before volleyball, not milk or peanut butter.
    assert [i["food_id"] for i in by_id["pre_workout"]["items"]] == ["est:dates"]
    # Shelf food added to a mess meal (milk with breakfast) is counted too.
    assert plan["extras_cost_inr"] == sum(m.get("cost_inr", 0) for m in plan["meals"])
    assert any(n["code"] == "mess_mode" for n in plan["notes"])
    assert plan["stale"] is False


def test_a_good_shelf_closes_the_protein_gap(client, ai_providers):
    headers, _ = _student(client, shelf=[*SHELF, "roasted_chana"])
    plan = _plan(client, headers)
    protein = sum(m["totals"]["protein"] for m in plan["meals"])
    assert protein >= plan["targets"]["protein"] * 0.9
    codes = [n["code"] for n in plan["notes"]]
    assert "shelf_suggestion" not in codes and "protein_short" not in codes


def test_a_short_day_says_how_to_fix_it(client, ai_providers):
    headers, _ = _student(client, "short@example.com")
    plan = _plan(client, headers)
    notes = {n["code"]: n["values"] for n in plan["notes"]}
    # The generic "swap in dal or paneer" note doesn't apply to a mess plate.
    assert "protein_short" not in notes
    assert notes["shelf_suggestion"]["key"] == "roasted_chana" and notes["shelf_suggestion"]["grams"] > 0
    kcal = sum(m["totals"]["kcal"] for m in plan["meals"])
    if kcal < plan["targets"]["calories"] * 0.92:
        assert notes["mess_calories_short"]["kcal"] == round(plan["targets"]["calories"] - kcal)


def test_the_mess_plate_is_sabzi_and_chapati_not_a_guessed_dish(client, ai_providers):
    headers, _ = _student(client, "plain@example.com")
    plan = _plan(client, headers)
    for slot in ("lunch", "dinner"):
        meal = next(m for m in plan["meals"] if m["id"] == slot)
        ids = {i["food_id"] for i in meal["items"]}
        assert {"est:mess_sabzi", "indb:ASC096"} <= ids
        sabzi = next(i for i in meal["items"] if i["food_id"] == "est:mess_sabzi")
        assert sabzi["quantity"] == 1  # one katori; only chapati is refilled


def test_a_thin_shelf_gets_a_cheap_protein_suggestion(client, ai_providers):
    headers, _ = _student(client, "thin@example.com", shelf=["dates", "banana"])
    plan = _plan(client, headers)
    suggestion = next(n for n in plan["notes"] if n["code"] == "shelf_suggestion")
    assert suggestion["values"]["key"] == "roasted_chana"
    assert suggestion["values"]["price_inr"] > 0 and suggestion["values"]["protein_g"] > 5


def test_mess_meals_cannot_be_replaced_but_shelf_meals_can(client, ai_providers):
    headers, _ = _student(client, "regen@example.com")
    plan = _plan(client, headers)
    assert client.post(f"{API}/diet-plans/current/meals/lunch/regenerate", headers=headers).status_code == 400
    shelf_meal = next(m for m in plan["meals"] if m["source"] == "shelf" and m["id"] != "pre_workout")
    res = client.post(f"{API}/diet-plans/current/meals/{shelf_meal['id']}/regenerate", headers=headers)
    assert res.status_code == 200, res.text
    new = next(m for m in res.json()["data"]["meals"] if m["id"] == shelf_meal["id"])
    assert new["source"] == "shelf"
    assert res.json()["data"]["mess_mode"] is True


def test_shelf_swaps_stay_on_the_shelf(client, ai_providers):
    headers, _ = _student(client, "swap@example.com")
    plan = _plan(client, headers)
    meal = next(m for m in plan["meals"] if m["source"] == "shelf")
    res = client.get(f"{API}/diet-plans/current/meals/{meal['id']}/items/0/alternatives", headers=headers)
    shelf_ids = {mess.SHELF[k].food_id for k in SHELF}
    options = res.json()["data"]
    options = options["options"] if isinstance(options, dict) else options
    assert options and {o["food_id"] for o in options} <= shelf_ids


def test_the_grocery_list_has_only_the_shelf(client, ai_providers):
    headers, _ = _student(client, "grocery@example.com")
    _plan(client, headers)
    data = client.get(f"{API}/diet-plans/current/grocery-list", headers=headers).json()["data"]
    names = {item["name"] for aisle in data["aisles"] for item in aisle["items"]}
    assert "Rice" not in names and "Whole wheat flour (atta)" not in names


def test_vegan_shelves_drop_milk(client, ai_providers):
    headers, _ = _student(client, "vegan@example.com", shelf=["milk", "peanuts", "banana"], diet="vegan")
    plan = _plan(client, headers)
    milk = mess.SHELF["milk"].food_id
    assert all(i["food_id"] != milk for m in plan["meals"] for i in m["items"])


def test_turning_mess_mode_off_goes_back_to_normal_plans(client, ai_providers):
    headers, _ = _student(client, "off@example.com")
    client.put(f"{API}/users/personalisation", headers=headers, json={"food_access": {"mess_meals": []}})
    ai_providers.gemini.append("not json")  # the AI fails: rules build a normal plan
    plan = _plan(client, headers)
    assert all(m.get("source") is None for m in plan["meals"])
    assert not plan.get("mess_mode")


def test_every_shelf_item_is_a_real_food():
    for item in mess.SHELF.values():
        assert food_db.get_food(item.food_id) is not None, item.key
    for plates in mess.MESS_PLATES.values():
        for plate in plates:
            for food_id, _ in plate:
                assert food_db.get_food(food_id) is not None, food_id


def test_milk_goes_with_breakfast_and_bed_and_never_more_than_three_glasses(client, ai_providers):
    headers, _ = _student(client, "milk@example.com")
    plan = _plan(client, headers)
    milk = mess.SHELF["milk"].food_id
    glasses = [m["id"] for m in plan["meals"] for i in m["items"] if i["food_id"] == milk]
    assert 0 < len(glasses) <= 3
    assert "lunch" not in glasses and "dinner" not in glasses


def test_the_mess_plate_is_never_swapped_for_shelf_food(client, ai_providers):
    headers, _ = _student(client, "plate@example.com")
    plan = _plan(client, headers)
    breakfast = next(m for m in plan["meals"] if m["id"] == "breakfast")
    plate_ids = {food_id for food_id, _ in mess.MESS_PLATES["breakfast"][0]}
    assert plate_ids & {i["food_id"] for i in breakfast["items"]}


def test_only_dal_rice_and_roti_are_refilled_at_the_mess(client, ai_providers):
    headers, _ = _student(client, "refill@example.com")
    plan = _plan(client, headers)
    plates = {food_id: servings for meal in mess.MESS_PLATES.values() for plate in meal for food_id, servings in plate}
    for meal in plan["meals"]:
        if meal["source"] != "mess":
            continue
        for item in meal["items"]:
            food = food_db.get_food(item["food_id"])
            if item["food_id"] in plates and not mess.refillable(food):
                assert item["quantity"] <= plates[item["food_id"]], item["name"]


def test_every_food_on_the_shelf_is_used_somewhere(client, ai_providers):
    shelf = ["butter", "peanut_butter", "brown_bread", "banana", "dates", "roasted_chana", "peanuts", "milk", "coffee"]
    headers, _ = _student(client, "everything@example.com", shelf=shelf)
    plan = _plan(client, headers)
    used = {i["food_id"] for m in plan["meals"] for i in m["items"]}
    assert {mess.SHELF[k].food_id for k in shelf} <= used
    # Coffee before training, not a second hot drink with the mess's tea; none late in the day.
    coffee = mess.SHELF["coffee"].food_id
    coffee_meals = [m["id"] for m in plan["meals"] for i in m["items"] if i["food_id"] == coffee]
    assert coffee_meals and set(coffee_meals) <= {"pre_workout", "mid_morning", "breakfast"}
    # One katori of the side dish, whatever it turns out to be.
    for meal in plan["meals"]:
        for item in meal["items"]:
            if item["food_id"] == "est:mess_sabzi":
                assert item["quantity"] == 1
