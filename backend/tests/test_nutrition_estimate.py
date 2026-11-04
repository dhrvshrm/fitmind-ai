import json

from tests.conftest import register_and_login

API = "/api/v1"


def parsed(*items):
    """Fake AI parse response for the given (name, quantity, unit) items."""
    return json.dumps({"items": [
        {"name": n, "quantity": q, "unit": u, "preparation": None} for n, q, u in items
    ]})


def estimate(client, headers, text):
    res = client.post(f"{API}/nutrition/estimate", headers=headers, json={"text": text})
    assert res.status_code == 200, res.text
    return res.json()["data"]


def test_dataset_foods_are_verified_and_scaled_by_quantity(client, ai_providers):
    headers, _ = register_and_login(client)
    ai_providers.gemini = [parsed(("aloo paratha", 2, "paratha"))]
    data = estimate(client, headers, "two aloo parathas")

    item = data["items"][0]
    assert item["source"] == "INDB" and item["verified"] is True
    assert item["name"] == "Potato parantha"
    per_100g, grams = item["per_100g"], item["grams"]
    assert abs(item["nutrients"]["kcal"] - per_100g["kcal"] * grams / 100) < 0.2
    assert item["quantity_assumed"] is False
    assert data["totals"]["kcal"] == item["nutrients"]["kcal"]


def test_missing_quantity_uses_default_serving_and_is_flagged(client, ai_providers):
    headers, _ = register_and_login(client)
    ai_providers.gemini = [parsed(("dal", None, None))]
    item = estimate(client, headers, "dal")["items"][0]
    assert item["quantity_assumed"] is True
    assert item["grams"] > 0


def test_unknown_food_gets_a_labelled_ai_estimate(client, ai_providers):
    headers, _ = register_and_login(client)
    ai_providers.gemini = [
        parsed(("vada pav", 1, None)),
        json.dumps({"grams": 130, "kcal": 290, "protein": 7, "carbs": 40, "fat": 11, "fiber": 3,
                    "confidence": "medium", "assumption": "One street-style vada pav with chutney."}),
    ]
    item = estimate(client, headers, "1 vada pav")["items"][0]
    assert item["source"] == "ai_estimate"
    assert item["verified"] is False
    assert item["nutrients"]["kcal"] == 290
    assert item["note"].startswith("One street-style")
    # Per-100 g values let the client rescale when the user edits grams.
    assert abs(item["per_100g"]["kcal"] - 290 / 130 * 100) < 0.5


def test_inconsistent_ai_numbers_are_rejected_and_retried(client, ai_providers):
    headers, _ = register_and_login(client)
    ai_providers.gemini = [
        parsed(("paneer bhurji", 1, "bowl")),
        # 900 kcal can't come from 10 g protein, 5 g carbs and 5 g fat.
        json.dumps({"grams": 150, "kcal": 900, "protein": 10, "carbs": 5, "fat": 5,
                    "confidence": "high", "assumption": ""}),
        json.dumps({"grams": 150, "kcal": 320, "protein": 18, "carbs": 8, "fat": 24,
                    "confidence": "medium", "assumption": "Paneer scrambled with onion and tomato."}),
    ]
    item = estimate(client, headers, "a bowl of paneer bhurji")["items"][0]
    assert item["nutrients"]["kcal"] == 320
    assert "previous answer was invalid" in ai_providers.calls[2]["prompt"]


def test_without_ai_known_foods_still_resolve_and_unknown_ones_are_unresolved(client, ai_providers):
    headers, _ = register_and_login(client)
    data = estimate(client, headers, "2 rotis and vada pav")
    by_query = {i["query"]: i for i in data["items"]}
    assert by_query["rotis"]["source"] == "INDB"
    assert by_query["vada pav"]["source"] == "unresolved"
    assert by_query["vada pav"]["nutrients"] is None
    assert data["unresolved_count"] == 1


def test_user_foods_are_matched_before_the_datasets(client, ai_providers):
    headers, _ = register_and_login(client)
    client.post(f"{API}/nutrition/my-foods", headers=headers, json={
        "name": "Mom's dal", "aliases": ["dal"], "serving_unit": "bowl", "serving_grams": 200,
        "calories": 210, "protein": 12, "carbs": 28, "fats": 6, "fiber": 5,
    })
    ai_providers.gemini = [parsed(("dal", 1, "bowl"))]
    item = estimate(client, headers, "a bowl of dal")["items"][0]
    assert item["source"] == "custom"
    assert item["nutrients"]["kcal"] == 210


def test_meal_parse_is_cached_but_food_lookups_still_run(client, ai_providers):
    headers, _ = register_and_login(client)
    ai_providers.gemini = [parsed(("idli", 3, None))]
    first = estimate(client, headers, "3 idli")
    second = estimate(client, headers, "3 idli")
    assert first["totals"] == second["totals"]
    assert len(ai_providers.calls) == 1


def test_food_search_endpoint(client):
    headers, _ = register_and_login(client)
    res = client.get(f"{API}/nutrition/foods/search", headers=headers, params={"q": "masala dosa"})
    foods = res.json()["data"]["foods"]
    assert foods[0]["name"] == "Masala dosa"
    assert {"per_100g", "serving", "source", "score"} <= set(foods[0])


def test_unresolved_items_say_why(client, ai_providers, monkeypatch):
    from app.config.settings import get_settings

    headers, _ = register_and_login(client)
    item = estimate(client, headers, "vada pav")["items"][0]
    assert item["unresolved_reason"] == "ai_not_configured"

    monkeypatch.setattr(get_settings(), "GEMINI_API_KEY", "set-but-failing")
    item = estimate(client, headers, "misal pav")["items"][0]
    assert item["unresolved_reason"] == "ai_failed"


def test_butter_paratha_with_curd_resolves_without_ai(client, ai_providers):
    """The user's real example: no AI configured, every food still found."""
    headers, _ = register_and_login(client)
    data = estimate(client, headers, "2 aalu butter paratha with curd")
    names = [(i["name"], i["source"]) for i in data["items"]]
    assert names == [
        ("Potato parantha", "INDB"),
        ("Butter", "USDA"),
        ("Curd (plain yogurt, whole milk)", "USDA"),
    ]
    butter = data["items"][1]
    assert butter["quantity_assumed"] is True and butter["quantity"] == 2
    assert data["unresolved_count"] == 0


def test_alcoholic_drinks_count_alcohol_energy(client, ai_providers):
    """Whisky has ~0 protein, carbs and fat; its energy comes from alcohol (7 kcal/g)."""
    headers, _ = register_and_login(client)
    ai_providers.gemini = [
        parsed(("scotch whisky", 240, "ml")),
        json.dumps({"grams": 230, "kcal": 560, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0,
                    "alcohol": 76, "confidence": "high", "assumption": "40% ABV whisky."}),
    ]
    item = estimate(client, headers, "240 ml scotch whisky")["items"][0]
    assert item["source"] == "ai_estimate"
    assert item["nutrients"]["kcal"] == 560
