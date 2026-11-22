"""Calories as close to real as we can get, and a clear flag when an estimate may be off."""
import json

import pytest

from app.nutrition import food_db
from app.nutrition.parser import parse_meal_rules
from tests.conftest import register_and_login

API = "/api/v1"


def _estimate(client, headers, text):
    res = client.post(f"{API}/nutrition/estimate", headers=headers, json={"text": text})
    assert res.status_code == 200, res.text
    return res.json()["data"]


def _ai(grams, kcal, protein, carbs, fat, confidence="medium"):
    return json.dumps({"grams": grams, "kcal": kcal, "protein": protein, "carbs": carbs, "fat": fat,
                       "fiber": 2, "alcohol": 0, "confidence": confidence, "assumption": "typical portion"})


# --- Dataset fixes ----------------------------------------------------------------
def test_poha_by_weight_uses_cooked_poha_not_a_dry_recipe_figure(client, ai_providers):
    headers, _ = register_and_login(client)
    item = _estimate(client, headers, "250 g poha")["items"][0]
    assert item["food_id"] == "indb:BFP045"
    # About 180 kcal per 100 g of cooked poha, not 295.
    assert 400 <= item["nutrients"]["kcal"] <= 500


def test_dry_yield_entries_are_never_matched_or_planned():
    for food_id in food_db.UNRELIABLE_IDS:
        name = food_db.get_food(food_id).name
        assert food_id not in [m.food.id for m in food_db.search(name, 10)]
    planned = [e.food.id for e in food_db._index()]
    assert set(food_db.UNRELIABLE_IDS) <= set(planned)  # still readable for old logs
    assert food_db.get_food("indb:BFP044") is not None


def test_street_food_comes_from_the_datasets_close_to_real_figures(client, ai_providers):
    headers, _ = register_and_login(client)
    data = _estimate(client, headers, "1 samosa and 1 pyaz ki kachori with kadhi")
    assert [i["food_id"] for i in data["items"]] == ["est:samosa", "est:pyaz_kachori", "est:kadhi"]
    # Published guides put this plate at about 560-730 kcal.
    assert 560 <= data["totals"]["kcal"] <= 730
    assert ai_providers.calls == [] or all(c["provider"] for c in ai_providers.calls)


@pytest.mark.parametrize(
    "text, low, high",
    [
        ("6 pani puri", 150, 260),
        ("1 vada pav", 250, 330),
        ("2 gulab jamun", 250, 330),
        ("1 plate bhel puri", 200, 300),
        ("4 momos", 130, 200),
    ],
)
def test_common_street_foods_land_in_realistic_ranges(client, ai_providers, text, low, high):
    headers, _ = register_and_login(client)
    data = _estimate(client, headers, text)
    assert data["items"][0]["source"] == "estimate"
    assert low <= data["totals"]["kcal"] <= high


def test_street_food_is_for_logging_never_for_plans():
    from app.nutrition import meal_planner
    from app.nutrition.diet_rules import DietRules

    pool = meal_planner.food_pool(DietRules.from_preferences({}), {})
    assert {"est:samosa", "est:maggi", "est:kulcha"} <= food_db.LOG_ONLY_IDS
    assert not {f.id for f in pool} & (food_db.LOG_ONLY_IDS | set(food_db.UNRELIABLE_IDS))


def test_every_hand_built_dish_adds_up():
    for food in [e.food for e in food_db._index() if e.food.id.startswith("est:")]:
        n = food.per_100g
        from_macros = 4 * n.protein + 4 * n.carbs + 9 * n.fat
        assert abs(from_macros - n.kcal) <= 0.1 * n.kcal + 10, food.id


@pytest.mark.parametrize(
    "text, quantity",
    [("quarter plate poha", 0.25), ("paav plate poha", 0.25), ("dedh roti", 1.5), ("aadhi plate rice", 0.5)],
)
def test_fractions_in_words_are_understood(text, quantity):
    assert parse_meal_rules(text)[0].quantity == quantity


# --- AI estimates: a range and a check --------------------------------------------
def _ai_item(client, ai_providers, item, estimate):
    """Estimate one food the datasets don't have: the AI parses it, then estimates it."""
    headers, _ = register_and_login(client)
    name, quantity, unit = item
    parse = json.dumps({"items": [{"name": name, "quantity": quantity, "unit": unit, "preparation": None}]})
    ai_providers.gemini += [parse, estimate]
    return _estimate(client, headers, f"{quantity} {unit} {name}")["items"][0]


def test_ai_estimates_come_with_a_range(client, ai_providers):
    item = _ai_item(client, ai_providers, ("zorblax stew", 1, "bowl"), _ai(150, 200, 8, 25, 7, "medium"))
    assert item["source"] == "ai_estimate"
    assert (item["kcal_low"], item["kcal_high"]) == (160, 240)
    assert item["check"] is None


def test_an_estimate_much_denser_than_a_similar_food_is_flagged(client, ai_providers):
    # Plain pulao in the datasets is about 140 kcal/100 g; 900 kcal for 250 g is 360.
    item = _ai_item(client, ai_providers, ("zafrani pulao", 1, "plate"), _ai(250, 900, 15, 110, 44))
    assert item["check"] == "higher_than_similar"
    assert item["similar_name"] and item["similar_kcal_per_100g"] < 200


def test_an_oddly_dense_dish_is_flagged_but_nuts_are_not(client, ai_providers):
    item = _ai_item(client, ai_providers, ("zorblax stew", 1, "bowl"), _ai(100, 600, 10, 50, 40))
    assert item["check"] == "very_dense"


def test_nuts_are_not_flagged_for_being_dense(client, ai_providers):
    item = _ai_item(client, ai_providers, ("zorblax nuts", 30, "g"), _ai(30, 180, 6, 6, 15))
    assert item["check"] is None


def test_a_huge_portion_for_the_container_is_flagged(client, ai_providers):
    item = _ai_item(client, ai_providers, ("zorblax stew", 1, "bowl"), _ai(600, 600, 20, 80, 22))
    assert item["check"] == "large_portion"


# --- Short meal names ------------------------------------------------------------
def _named(query, kcal):
    return {"query": query, "name": query.title(), "nutrients": {"kcal": kcal}}


@pytest.mark.parametrize(
    "items, name",
    [
        ([_named("poha", 180), _named("chai", 90), _named("water", 0)], "Poha and chai"),
        ([_named("rajma curry", 172), _named("rice", 263), _named("salad", 45)], "Rajma curry, rice and salad"),
        ([_named("samosa", 240)], "Samosa"),
        ([_named(f"food {n}", 100 - n) for n in range(5)], "Food 0, food 1, food 2 and 2 more"),
        ([_named("water", 0)], "Water"),
    ],
)
def test_meal_names_are_short(items, name):
    from app.nutrition.naming import concise_meal_name

    assert concise_meal_name(items) == name
