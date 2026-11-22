"""Healthy treats: options per craving, diet and health rules, logging and the weekly count."""
import pytest

from app.nutrition import food_db, treats
from app.nutrition.diet_rules import DietRules
from tests.conftest import register_and_login
from tests.health_helpers import API, grant

TREATS = f"{API}/diet-plans/treats"


def _user(client, prefs=None, email="treat@example.com"):
    headers, user_id = register_and_login(client, email=email)
    if prefs:
        res = client.put(f"{API}/users/personalisation", headers=headers, json={"food_preferences": prefs})
        assert res.status_code == 200, res.text
    return headers


def _ids(client, headers, craving):
    res = client.get(TREATS, headers=headers, params={"craving": craving})
    assert res.status_code == 200, res.text
    return [o["id"] for o in res.json()["data"]["options"]]


def test_every_treat_uses_real_foods_and_has_honest_numbers():
    data = treats.catalog()
    assert set(data.cravings) == {"sweet", "cake", "pizza_burger", "salty", "tandoori", "street_food"}
    for craving in data.cravings:
        assert [t for t in data.treats if t.craving == craving], craving
    for treat in data.treats:
        total = treats.totals(treat)
        # Worked out from the database: the sum of each food's grams.
        expected = sum(food_db.get_food(i.food_id).per_100g.kcal * i.grams / 100 for i in treat.items)
        assert total.kcal == pytest.approx(expected, abs=1)
        # A treat, not a second dinner.
        assert 50 <= total.kcal <= 450, treat.id


def test_there_are_protein_cakes_burgers_sandwiches_and_pizza():
    names = " ".join(t.name.lower() for t in treats.catalog().treats)
    for word in ("cake", "burger", "sandwich", "pizza", "pancakes"):
        assert word in names
    cakes = [t for t in treats.catalog().treats if t.craving == "cake"]
    assert max(treats.totals(t).protein for t in cakes) >= 30


def test_options_are_lightest_first_with_numbers_and_items(client):
    headers = _user(client)
    data = client.get(TREATS, headers=headers, params={"craving": "sweet"}).json()["data"]
    kcal = [o["nutrients"]["kcal"] for o in data["options"]]
    assert kcal == sorted(kcal)
    first = data["options"][0]
    assert first["items"] and first["why"] and first["instead_of"]
    assert data["week"] == {"logged": 0, "suggested": treats.TREATS_PER_WEEK}
    assert "calories_remaining" in data


def test_an_unknown_craving_or_treat_is_refused(client):
    headers = _user(client)
    assert client.get(TREATS, headers=headers, params={"craving": "pasta"}).status_code == 400
    assert client.post(f"{TREATS}/nope/log", headers=headers, json={}).status_code == 400


@pytest.mark.parametrize(
    "prefs, hidden",
    [
        ({"diet_type": "vegetarian"}, {"tandoori_chicken", "fish_tikka"}),
        ({"diet_type": "vegetarian", "eats_eggs": False}, {"egg_bhurji_burger", "protein_mug_cake"}),
        ({"diet_type": "jain"}, {"sweet_potato_chaat", "pav_bhaji_light", "sprouts_chaat", "egg_bhurji_burger"}),
        ({"allergies": ["Peanuts"]}, {"dates_peanut_butter", "makhana_peanut_mix"}),
    ],
)
def test_options_follow_diet_and_allergies(client, prefs, hidden):
    headers = _user(client, prefs)
    every = set()
    for craving in treats.cravings():
        every |= set(_ids(client, headers, craving))
    assert not hidden & every
    assert every  # something is always left to pick


def test_high_blood_sugar_leaves_out_sugary_treats_and_still_offers_sweet_ones(client):
    headers = _user(client)
    grant(client, headers, "health_profile")
    client.put(f"{API}/health-profile", headers=headers,
               json={"conditions": [{"key": "diabetes", "details": {"type": "type2"}}]})
    sweet = _ids(client, headers, "sweet")
    assert sweet
    sugary = {t.id for t in treats.catalog().treats if "sugar" in t.tags}
    assert not sugary & set(sweet)
    assert "hung_curd_apple" in sweet
    assert client.post(f"{TREATS}/kulfi_small/log", headers=headers, json={}).status_code == 400


def test_high_blood_pressure_adds_a_salt_tip(client):
    headers = _user(client)
    grant(client, headers, "health_profile")
    client.put(f"{API}/health-profile", headers=headers, json={"conditions": [{"key": "hypertension", "details": {}}]})
    options = client.get(TREATS, headers=headers, params={"craving": "pizza_burger"}).json()["data"]["options"]
    by_id = {o["id"]: o for o in options}
    assert by_id["bread_pizza"]["tips"] == ["salt"]
    assert by_id["paneer_sandwich"]["tips"] == []


def test_logging_a_treat_logs_a_meal_and_counts_it_for_the_week(client):
    headers = _user(client)
    res = client.post(f"{TREATS}/protein_mug_cake/log", headers=headers, json={})
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    meal = data["meal"]
    total = treats.totals(treats.get_treat("protein_mug_cake"))
    assert meal["name"] == "Chocolate protein mug cake"
    assert meal["calories"] == pytest.approx(total.kcal)
    assert meal["meal_type"] == "snack"
    assert len(meal["items"]) == 5 and all(i["verified"] for i in meal["items"])
    assert data["week"]["logged"] == 1

    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    assert today["totals"]["calories"] == pytest.approx(total.kcal)

    # Deleting the meal takes the treat off this week's count.
    assert client.delete(f"{API}/nutrition/meal/{meal['id']}", headers=headers).status_code == 200
    week = client.get(TREATS, headers=headers, params={"craving": "cake"}).json()["data"]["week"]
    assert week["logged"] == 0


def test_treats_respect_an_active_fasting_mode():
    rules = DietRules.from_preferences({}).with_fasting_mode("navratri")
    pizza = treats.get_treat("bread_pizza")
    assert not treats.allowed(pizza, rules, set())
