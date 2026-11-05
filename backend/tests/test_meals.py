import asyncio
from datetime import timedelta

from app.models import audit
from app.utils.time import local_today
from tests.conftest import register_and_login

API = "/api/v1"

ITEM = {
    "name": "Potato parantha", "food_id": "indb:ASC098", "source": "INDB", "verified": True,
    "quantity": 2, "unit": "paratha", "grams": 186.8,
    "nutrients": {"kcal": 383, "protein": 6.9, "carbs": 44.7, "fat": 19.1, "fiber": 7.8},
}
MEAL = {
    "name": "Aloo paratha", "calories": 383, "protein": 6.9, "carbs": 44.7, "fats": 19.1,
    "fiber": 7.8, "meal_type": "breakfast", "eaten_at": "08:30", "items": [ITEM],
}


def log(client, headers, **overrides):
    res = client.post(f"{API}/nutrition/meal", headers=headers, json={**MEAL, **overrides})
    assert res.status_code == 200, res.text
    return res.json()["data"]["meal"]


def test_meal_with_items_keeps_details_and_source(client):
    headers, _ = register_and_login(client)
    meal = log(client, headers)
    assert meal["source"] == "verified"
    assert meal["meal_type"] == "breakfast" and meal["eaten_at"] == "08:30"
    assert meal["items"][0]["food_id"] == "indb:ASC098"

    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    assert today["totals"]["fiber"] == 7.8
    assert today["goals"]["fiber"] > 0
    assert today["meals"][0]["id"] == meal["id"]


def test_meal_source_reflects_ai_estimates(client):
    headers, _ = register_and_login(client)
    ai_item = {**ITEM, "name": "vada pav", "food_id": None, "source": "ai_estimate", "verified": False}
    assert log(client, headers, items=[ai_item])["source"] == "estimated"
    assert log(client, headers, items=[ITEM, ai_item])["source"] == "mixed"
    assert log(client, headers, items=[])["source"] == "manual"


def test_edit_marks_meal_edited_and_is_audited(client):
    headers, user_id = register_and_login(client)
    meal = log(client, headers)
    res = client.put(f"{API}/nutrition/meal/{meal['id']}", headers=headers, json={"calories": 420})
    updated = res.json()["data"]["meal"]
    assert updated["calories"] == 420 and updated["edited"] is True

    entries = asyncio.run(audit.get_history(user_id, entity="meal"))
    assert entries[0]["before"]["calories"] == 383
    assert entries[0]["after"]["calories"] == 420


def test_delete_meal_removes_it_from_today(client):
    headers, _ = register_and_login(client)
    meal = log(client, headers)
    assert client.delete(f"{API}/nutrition/meal/{meal['id']}", headers=headers).status_code == 200
    assert client.get(f"{API}/nutrition/today", headers=headers).json()["data"]["meals_logged"] == 0


def test_users_cannot_edit_or_delete_each_others_meals(client):
    owner, _ = register_and_login(client, "owner@example.com")
    other, _ = register_and_login(client, "other@example.com")
    meal = log(client, owner)
    assert client.put(f"{API}/nutrition/meal/{meal['id']}", headers=other, json={"calories": 1}).status_code == 404
    assert client.delete(f"{API}/nutrition/meal/{meal['id']}", headers=other).status_code == 404
    assert client.get(f"{API}/nutrition/today", headers=owner).json()["data"]["meals_logged"] == 1


def test_backfill_is_limited_to_the_last_week(client):
    headers, _ = register_and_login(client)
    yesterday = (local_today() - timedelta(days=1)).isoformat()
    assert log(client, headers, log_date=yesterday)["date"] == yesterday
    too_old = (local_today() - timedelta(days=30)).isoformat()
    res = client.post(f"{API}/nutrition/meal", headers=headers, json={**MEAL, "log_date": too_old})
    assert res.status_code == 400
    future = (local_today() + timedelta(days=1)).isoformat()
    res = client.post(f"{API}/nutrition/meal", headers=headers, json={**MEAL, "log_date": future})
    assert res.status_code == 400


def test_invalid_time_is_rejected(client):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/nutrition/meal", headers=headers, json={**MEAL, "eaten_at": "25:00"})
    assert res.status_code == 422


def test_recent_meals_are_distinct_and_counted(client):
    headers, _ = register_and_login(client)
    log(client, headers)
    log(client, headers)
    log(client, headers, name="Poha")
    recent = client.get(f"{API}/nutrition/recent", headers=headers).json()["data"]["meals"]
    by_name = {m["name"]: m for m in recent}
    assert by_name["Aloo paratha"]["times_logged"] == 2
    assert recent[0]["name"] == "Poha"  # Most recent first.


def test_saved_meal_from_logged_meal_logs_in_one_step(client):
    headers, _ = register_and_login(client)
    meal = log(client, headers)
    saved = client.post(f"{API}/nutrition/saved-meals", headers=headers,
                        json={"name": "Usual breakfast", "from_meal_id": meal["id"]}).json()["data"]["saved_meal"]
    assert saved["totals"]["kcal"] == 383 and saved["meal_type"] == "breakfast"

    res = client.post(f"{API}/nutrition/saved-meals/{saved['id']}/log", headers=headers, json={})
    assert res.json()["data"]["meal"]["name"] == "Usual breakfast"
    listed = client.get(f"{API}/nutrition/saved-meals", headers=headers).json()["data"]["saved_meals"]
    assert listed[0]["times_logged"] == 1
    assert client.get(f"{API}/nutrition/today", headers=headers).json()["data"]["meals_logged"] == 2


def test_saved_meals_and_foods_are_private(client):
    owner, _ = register_and_login(client, "owner@example.com")
    other, _ = register_and_login(client, "other@example.com")
    saved = client.post(f"{API}/nutrition/saved-meals", headers=owner,
                        json={"name": "Mine", "items": [ITEM]}).json()["data"]["saved_meal"]
    assert client.post(f"{API}/nutrition/saved-meals/{saved['id']}/log", headers=other, json={}).status_code == 404
    assert client.get(f"{API}/nutrition/saved-meals", headers=other).json()["data"]["saved_meals"] == []
    food = client.post(f"{API}/nutrition/my-foods", headers=owner,
                       json={"name": "Protein shake", "calories": 180, "protein": 25}).json()["data"]["food"]
    assert client.delete(f"{API}/nutrition/my-foods/{food['id']}", headers=other).status_code == 404


def test_whole_day_logs_as_separate_meals_in_one_request(client):
    headers, _ = register_and_login(client)
    day = [
        {**MEAL, "name": "Poha", "meal_type": "breakfast", "eaten_at": "08:30"},
        {**MEAL, "name": "Rajma chawal", "meal_type": "lunch", "eaten_at": "13:30"},
        {**MEAL, "name": "Khichdi", "meal_type": "dinner", "eaten_at": "20:30"},
    ]
    res = client.post(f"{API}/nutrition/meals/batch", headers=headers, json={"meals": day})
    assert res.status_code == 200, res.text
    assert [m["meal_type"] for m in res.json()["data"]["meals"]] == ["breakfast", "lunch", "dinner"]
    assert res.json()["data"]["xp_earned"] == 60
    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    assert today["meals_logged"] == 3


def test_batch_with_an_invalid_date_saves_nothing(client):
    headers, _ = register_and_login(client)
    too_old = (local_today() - timedelta(days=30)).isoformat()
    res = client.post(f"{API}/nutrition/meals/batch", headers=headers, json={"meals": [
        {**MEAL, "name": "Poha"}, {**MEAL, "name": "Old", "log_date": too_old},
    ]})
    assert res.status_code == 400
    assert client.get(f"{API}/nutrition/today", headers=headers).json()["data"]["meals_logged"] == 0


def test_transcribe_rejects_non_audio_and_reports_missing_ai(client):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/nutrition/transcribe", headers=headers,
                      files={"audio": ("notes.txt", b"hello", "text/plain")})
    assert res.status_code == 400
    res = client.post(f"{API}/nutrition/transcribe", headers=headers,
                      files={"audio": ("meal.webm", b"\x1a\x45\xdf\xa3", "audio/webm")})
    assert res.status_code == 400  # No Groq key in tests.
