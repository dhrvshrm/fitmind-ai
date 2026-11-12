"""Barcode lookup (Open Food Facts) and meal photo estimates. No live network or AI."""
import json

import httpx
import pytest

from app.ai import client as ai_client
from app.nutrition import open_food_facts
from tests.conftest import register_and_login

API = "/api/v1/nutrition"

PRODUCT = {
    "code": "8901058851298",
    "product_name": "Masala Oats",
    "brands": "Saffola, Marico",
    "quantity": "500 g",
    "product_quantity": "500",
    "serving_size": "40 g",
    "serving_quantity": 40,
    "image_front_small_url": "https://images.openfoodfacts.org/x.jpg",
    "nutriments": {
        "energy-kcal_100g": 380,
        "proteins_100g": 11.2,
        "carbohydrates_100g": 64.5,
        "fat_100g": 8.4,
        "fiber_100g": 9.1,
    },
}


class FakeOFF:
    """Stands in for httpx.AsyncClient; records requests, returns scripted responses."""

    def __init__(self):
        self.responses = []
        self.requests = []

    def install(self, monkeypatch):
        fake = self

        class _Client:
            def __init__(self, *args, **kwargs):
                fake.headers = kwargs.get("headers", {})

            async def __aenter__(self):
                return self

            async def __aexit__(self, *exc):
                return False

            async def get(self, url, params=None):
                fake.requests.append(url)
                item = fake.responses.pop(0)
                if isinstance(item, Exception):
                    raise item
                status, body = item
                return httpx.Response(status, content=json.dumps(body).encode(), request=httpx.Request("GET", url))

        monkeypatch.setattr(open_food_facts.httpx, "AsyncClient", _Client)
        return self


@pytest.fixture
def off(monkeypatch):
    open_food_facts._MEMORY_CACHE.clear()
    return FakeOFF().install(monkeypatch)


# --- Barcode --------------------------------------------------------------------------
def test_barcode_found_maps_label_values(client, off):
    headers, _ = register_and_login(client)
    off.responses.append((200, {"status": 1, "product": PRODUCT}))
    res = client.get(f"{API}/barcode/8901058851298", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["name"] == "Masala Oats"
    assert data["brand"] == "Saffola"
    assert data["source"] == "open_food_facts"
    assert data["per_100g"] == {"kcal": 380, "protein": 11.2, "carbs": 64.5, "fat": 8.4, "fiber": 9.1}
    options = {o["id"]: o["grams"] for o in data["serving_options"]}
    assert options == {"100g": 100, "serving": 40, "pack": 500}
    assert data["default_serving"] == "serving"
    # Identifies the app without personal details.
    assert off.headers["User-Agent"].startswith("FitMindAI/1.0")
    assert "@" not in off.headers["User-Agent"]


def test_barcode_lookups_are_cached(client, off):
    headers, _ = register_and_login(client)
    off.responses.append((200, {"status": 1, "product": PRODUCT}))
    client.get(f"{API}/barcode/8901058851298", headers=headers)
    res = client.get(f"{API}/barcode/8901058851298", headers=headers)
    assert res.status_code == 200
    assert len(off.requests) == 1


def test_barcode_not_found_is_honest(client, off):
    headers, _ = register_and_login(client)
    off.responses.append((404, {"status": 0, "status_verbose": "product not found"}))
    res = client.get(f"{API}/barcode/0000000000000", headers=headers)
    assert res.status_code == 404
    body = res.json()
    assert body["success"] is False
    assert body["data"]["code"] == "not_found"
    # Misses are cached too (briefly).
    client.get(f"{API}/barcode/0000000000000", headers=headers)
    assert len(off.requests) == 1


def test_barcode_status_zero_with_200(client, off):
    headers, _ = register_and_login(client)
    off.responses.append((200, {"status": 0}))
    assert client.get(f"{API}/barcode/12345678", headers=headers).status_code == 404


def test_barcode_service_down(client, off):
    headers, _ = register_and_login(client)
    off.responses.append(httpx.ConnectError("boom"))
    res = client.get(f"{API}/barcode/8901058851298", headers=headers)
    assert res.status_code == 503
    assert res.json()["data"]["code"] == "lookup_unavailable"
    # Failures aren't cached: the next try asks again.
    off.responses.append((200, {"status": 1, "product": PRODUCT}))
    assert client.get(f"{API}/barcode/8901058851298", headers=headers).status_code == 200


def test_invalid_barcode(client, off):
    headers, _ = register_and_login(client)
    res = client.get(f"{API}/barcode/abc", headers=headers)
    assert res.status_code == 400
    assert off.requests == []


def test_kilojoules_only_and_missing_energy():
    kj = open_food_facts.per_100g({"energy_100g": 418.4, "proteins_100g": 1})
    assert kj.kcal == 100
    assert open_food_facts.per_100g({"proteins_100g": 5}) is None
    product = open_food_facts.map_product("12345678", {"product_name": "Water", "nutriments": {}})
    assert product["has_nutrition"] is False
    assert product["serving_options"] == [{"id": "100g", "label": "100 g", "grams": 100.0}]


def test_logging_a_barcode_item_keeps_provenance(client):
    headers, _ = register_and_login(client)
    item = {
        "name": "Masala Oats", "source": "open_food_facts", "verified": True, "quantity": 1,
        "unit": "serving", "grams": 40,
        "nutrients": {"kcal": 152, "protein": 4.5, "carbs": 25.8, "fat": 3.4, "fiber": 3.6},
    }
    res = client.post(f"{API}/meal", json={
        "name": "Masala Oats", "calories": 152, "protein": 4.5, "carbs": 25.8, "fats": 3.4,
        "fiber": 3.6, "meal_type": "breakfast", "items": [item],
    }, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["meal"]["items"][0]["source"] == "open_food_facts"


# --- Photo ------------------------------------------------------------------------------
class FakeVision:
    def __init__(self):
        self.responses = []
        self.calls = []

    async def __call__(self, prompt, system, image, mime_type):
        self.calls.append({"prompt": prompt, "image": image, "mime_type": mime_type})
        item = self.responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


@pytest.fixture
def vision(monkeypatch, ai_providers):
    fake = FakeVision()
    monkeypatch.setitem(ai_client._VISION_PROVIDERS, ai_client.PROVIDER_GEMINI, fake)
    return fake


JPEG = b"\xff\xd8\xff\xe0fake-jpeg-bytes"


def _upload(client, headers, data=JPEG, content_type="image/jpeg"):
    return client.post(
        f"{API}/photo-estimate", files={"image": ("meal.jpg", data, content_type)}, headers=headers
    )


def test_photo_dishes_go_through_food_database(client, vision):
    headers, _ = register_and_login(client)
    vision.responses.append(json.dumps({"is_food": True, "dishes": [
        {"name": "dal", "quantity": 1, "unit": "katori"},
        {"name": "rice", "quantity": 1, "unit": "bowl"},
        {"name": "roti", "quantity": 2, "unit": "roti"},
    ]}))
    res = _upload(client, headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert [i["source"] for i in data["items"]] == ["INDB", "INDB", "INDB"]
    assert all(i["verified"] for i in data["items"])
    # Portions came from a photo, so the review asks the user to check them.
    assert all(i["quantity_assumed"] for i in data["items"])
    assert data["totals"]["kcal"] > 0
    assert vision.calls[0]["image"] == JPEG


def test_photo_unmatched_dish_uses_labelled_estimate(client, vision, ai_providers):
    headers, _ = register_and_login(client)
    vision.responses.append(json.dumps({"is_food": True, "dishes": [{"name": "zzqx mystery curry"}]}))
    # The estimator's AI fallback (text providers) is unavailable -> unresolved, not made up.
    res = _upload(client, headers)
    assert res.status_code == 200
    item = res.json()["data"]["items"][0]
    assert item["source"] == "unresolved"
    assert res.json()["data"]["unresolved_count"] == 1


def test_photo_not_food(client, vision):
    headers, _ = register_and_login(client)
    vision.responses.append(json.dumps({"is_food": False, "dishes": []}))
    res = _upload(client, headers)
    assert res.status_code == 422
    assert res.json()["data"]["code"] == "no_food"


def test_photo_ai_unavailable(client, ai_providers):
    # No API key in tests: the real Gemini vision provider refuses.
    headers, _ = register_and_login(client)
    res = _upload(client, headers)
    assert res.status_code == 503
    body = res.json()
    assert body["data"]["code"] == "ai_not_configured"
    assert "Describe the meal" in body["message"]


def test_photo_vision_error(client, vision, monkeypatch):
    headers, _ = register_and_login(client)
    vision.responses.append(ai_client.AIError("down"))
    monkeypatch.setattr(
        "app.services.food_scan_service.get_settings",
        lambda: type("S", (), {"GEMINI_API_KEY": "set"})(),
    )
    res = _upload(client, headers)
    assert res.status_code == 503
    assert res.json()["data"]["code"] == "ai_unavailable"


def test_photo_rejects_non_images_and_large_files(client, vision):
    headers, _ = register_and_login(client)
    assert _upload(client, headers, b"hello", "text/plain").status_code == 400
    big = b"0" * (6 * 1024 * 1024 + 10)
    assert _upload(client, headers, big).json()["data"]["code"] == "image_too_large"
    assert vision.calls == []
