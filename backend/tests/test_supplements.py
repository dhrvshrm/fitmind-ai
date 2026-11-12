import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from app.health import supplement_rules
from app.models.user import User
from app.services import supplement_service
from tests.conftest import ONBOARDING, register_and_login
from tests.health_helpers import API, grant

CATALOG = Path(__file__).resolve().parent.parent / "app" / "health" / "data" / "supplements.json"


def _onboard(client, email="supps@example.com", **extra):
    headers, user_id = register_and_login(client, email)
    client.post(f"{API}/users/onboarding", headers=headers, json={**ONBOARDING, **extra})
    return headers, user_id


def _catalog(client, headers):
    entries = client.get(f"{API}/supplements/catalog", headers=headers).json()["data"]["supplements"]
    return {e["id"]: e for e in entries}


def _codes(entry):
    return {(f["code"], f["severity"]) for f in entry["safety_flags"]}


# --- Catalogue ------------------------------------------------------------------
def test_catalogue_is_curated_and_cites_sources():
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    ids = {s["id"] for s in data["supplements"]}
    assert {"whey_protein", "plant_protein", "creatine_monohydrate", "vitamin_d3", "vitamin_b12", "omega_3",
            "iron", "magnesium", "multivitamin", "caffeine", "electrolytes", "ashwagandha"} <= ids
    for entry in data["supplements"]:
        assert entry["sources"], entry["id"]
        assert all(s["url"].startswith("https://") for s in entry["sources"])
        assert entry["evidence"] and entry["typical_dose"] and entry["timing"]
        assert {e["level"] for e in entry["evidence"]} <= {"strong", "moderate", "limited", "insufficient"}
    assert next(s for s in data["supplements"] if s["id"] == "ashwagandha")["extra_caution"] is True


def test_personal_reasons_use_diet_goal_and_confirmed_values(client):
    headers, _ = _onboard(client, fitness_goal="build_muscle", workout_days_per_week=4,
                          food_preferences={"diet_type": "vegetarian"})
    grant(client, headers, "health_reports")
    client.post(f"{API}/biomarkers", headers=headers,
                json={"name": "Vitamin B12", "value": 150, "unit": "pg/mL", "measured_at": "2026-10-01"})
    catalog = _catalog(client, headers)
    b12 = catalog["vitamin_b12"]
    assert b12["relevant"] is True
    assert any("animal foods" in r for r in b12["reasons"])
    assert any("150 pg/mL on 2026-10-01" in r for r in b12["reasons"])
    assert catalog["creatine_monohydrate"]["relevant"] is True
    assert any("protein target" in r for r in catalog["whey_protein"]["reasons"])
    assert ("vegetarian_source", "info") in _codes(catalog["omega_3"])
    # Without a test showing low iron, iron only gets a caution.
    assert ("iron_test", "caution") in _codes(catalog["iron"])


def test_values_without_consent_are_not_used(client):
    headers, user_id = _onboard(client)
    grant(client, headers, "health_reports")
    client.post(f"{API}/biomarkers", headers=headers, json={"name": "Vitamin D", "value": 10, "unit": "ng/mL"})
    assert _catalog(client, headers)["vitamin_d3"]["relevant"] is True
    client.delete(f"{API}/consents/health_reports", headers=headers)
    assert _catalog(client, headers)["vitamin_d3"]["relevant"] is False


# --- Safety flags ---------------------------------------------------------------
def test_safety_flags_from_the_health_profile(client):
    headers, _ = _onboard(client)
    grant(client, headers, "health_profile")
    client.put(f"{API}/health-profile", headers=headers, json={
        "conditions": [
            {"key": "kidney", "details": {"type": "ckd"}},
            {"key": "hypertension", "details": {"on_medication": True}},
            {"key": "thyroid", "details": {"type": "hypothyroid", "on_medication": True}},
        ],
        "medications": "Warfarin 5 mg",
    })
    catalog = _catalog(client, headers)
    assert ("kidney", "doctor_first") in _codes(catalog["creatine_monohydrate"])
    assert ("kidney", "doctor_first") in _codes(catalog["whey_protein"])
    assert ("blood_thinners", "doctor_first") in _codes(catalog["omega_3"])
    assert ("thyroid_timing", "caution") in _codes(catalog["iron"])
    assert ("thyroid_timing", "caution") in _codes(catalog["calcium"])
    assert ("blood_pressure", "caution") in _codes(catalog["caffeine"])
    assert ("thyroid", "doctor_first") in _codes(catalog["ashwagandha"])
    assert catalog["creatine_monohydrate"]["doctor_first"] is True
    # Most serious first.
    assert catalog["ashwagandha"]["safety_flags"][0]["severity"] == "doctor_first"


def test_pregnancy_flags_every_supplement():
    flags = {"pregnancy", "pregnant"}
    for supplement_id in ("vitamin_d3", "ashwagandha", "caffeine", "creatine_monohydrate"):
        result = supplement_rules.safety_flags(supplement_id, flags, {}, 30)
        assert result[0]["code"] == "pregnancy" and result[0]["severity"] == "doctor_first"
    assert "200 mg" in supplement_rules.safety_flags("caffeine", flags, {}, 30)[0]["message"]


def test_dairy_avoiders_and_minors_get_flags():
    assert ("dairy", "caution") in {(f["code"], f["severity"]) for f in
                                    supplement_rules.safety_flags("whey_protein", set(), {"eats_dairy": False}, 30)}
    minor = supplement_rules.safety_flags("creatine_monohydrate", set(), {}, 16)
    assert minor[0]["code"] == "minor"


def test_supplement_info_for_the_coach(client):
    headers, user_id = _onboard(client)
    user = asyncio.run(User.get_by_id(user_id))
    info = asyncio.run(supplement_service.supplement_info("creatine_monohydrate", user))
    assert info["name"] == "Creatine monohydrate" and "safety_flags" in info and "reasons" in info
    assert asyncio.run(supplement_service.supplement_info("nope", user)) is None


# --- Tracking -------------------------------------------------------------------
def test_tracking_and_daily_tick_off(client):
    headers, user_id = _onboard(client)
    res = client.post(f"{API}/supplements/mine", headers=headers,
                      json={"supplement_id": "vitamin_d3", "dose": "1000 IU"})
    assert res.status_code == 200, res.text
    item = res.json()["data"]
    assert item["name"] == "Vitamin D3" and item["timing"] == "with_lunch"
    assert item["taken_today"] is False and item["adds_to_nutrition"] is False

    taken = client.post(f"{API}/supplements/mine/{item['id']}/taken", headers=headers).json()["data"]
    assert taken["taken_today"] is True
    # Ticking twice doesn't double count.
    client.post(f"{API}/supplements/mine/{item['id']}/taken", headers=headers)
    history = client.get(f"{API}/supplements/history?days=3", headers=headers).json()["data"]
    assert history[-1] == {"date": history[-1]["date"], "taken": 1, "total": 1}
    # Vitamins add nothing to nutrition.
    assert client.get(f"{API}/nutrition/today", headers=headers).json()["data"]["meals_logged"] == 0

    listed = asyncio.run(supplement_service.list_user_supplements(user_id))
    assert listed[0]["taken_today"] is True and listed[0]["dose"] == "1000 IU"

    client.delete(f"{API}/supplements/mine/{item['id']}/taken", headers=headers)
    assert client.get(f"{API}/supplements/mine", headers=headers).json()["data"][0]["taken_today"] is False
    assert client.delete(f"{API}/supplements/mine/{item['id']}", headers=headers).status_code == 200
    assert client.get(f"{API}/supplements/mine", headers=headers).json()["data"] == []


def test_protein_powder_adds_its_macros_to_the_day(client):
    headers, _ = _onboard(client)
    item = client.post(f"{API}/supplements/mine", headers=headers, json={
        "supplement_id": "whey_protein", "dose": "1 scoop",
        "macros_per_serving": {"calories": 130, "protein": 25, "carbs": 3, "fats": 2},
    }).json()["data"]
    assert item["adds_to_nutrition"] is True

    client.post(f"{API}/supplements/mine/{item['id']}/taken", headers=headers)
    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    assert today["meals_logged"] == 1
    assert today["totals"]["protein"] == 25 and today["totals"]["calories"] == 130
    meal = today["meals"][0]
    assert meal["meal_type"] == "snack"
    assert meal["items"][0]["provenance"] == "supplement"
    assert meal["items"][0]["user_supplement_id"] == item["id"]

    # Unticking removes it again.
    client.delete(f"{API}/supplements/mine/{item['id']}/taken", headers=headers)
    assert client.get(f"{API}/nutrition/today", headers=headers).json()["data"]["meals_logged"] == 0


def test_catalogue_protein_macros_are_used_by_default(client):
    headers, _ = _onboard(client)
    item = client.post(f"{API}/supplements/mine", headers=headers,
                       json={"supplement_id": "plant_protein"}).json()["data"]
    assert item["macros_per_serving"]["protein"] == 22


def test_custom_and_blocked_supplements(client):
    headers, _ = _onboard(client)
    custom = client.post(f"{API}/supplements/mine", headers=headers,
                         json={"name": "Zinc", "dose": "15 mg", "timing": "evening"})
    assert custom.status_code == 200 and custom.json()["data"]["supplement_id"] == "custom"
    blocked = client.post(f"{API}/supplements/mine", headers=headers, json={"name": "SARMs stack"})
    assert blocked.status_code == 400
    assert client.post(f"{API}/supplements/mine", headers=headers,
                       json={"supplement_id": "unknown"}).status_code == 404
    other, _ = register_and_login(client, "other@example.com")
    item_id = custom.json()["data"]["id"]
    assert client.post(f"{API}/supplements/mine/{item_id}/taken", headers=other).status_code == 404


def test_due_reminders_follow_the_users_timezone(client):
    headers, user_id = _onboard(client)
    morning = client.post(f"{API}/supplements/mine", headers=headers,
                          json={"supplement_id": "vitamin_b12", "reminder_time": "08:00"}).json()["data"]
    client.post(f"{API}/supplements/mine", headers=headers, json={"name": "Creatine", "timing": "any"})
    user = asyncio.run(User.get_by_id(user_id))
    user.timezone = "Asia/Kolkata"

    # 08:10 IST is 02:40 UTC.
    now = datetime(2026, 11, 12, 2, 40, tzinfo=timezone.utc)
    due = asyncio.run(supplement_service.due_supplement_reminders(user, now))
    assert [d["user_supplement_id"] for d in due] == [morning["id"]]
    assert due[0]["key"] == f"supplement:{morning['id']}:2026-11-12"
    assert due[0]["title"] and due[0]["body"] and due[0]["url"]

    later = datetime(2026, 11, 12, 5, 0, tzinfo=timezone.utc)  # 10:30 IST: outside the window.
    assert asyncio.run(supplement_service.due_supplement_reminders(user, later)) == []


def test_account_deletion_includes_supplements(client, mock_db):
    headers, user_id = _onboard(client)
    item = client.post(f"{API}/supplements/mine", headers=headers,
                       json={"supplement_id": "whey_protein"}).json()["data"]
    client.post(f"{API}/supplements/mine/{item['id']}/taken", headers=headers)
    assert client.delete(f"{API}/settings/account", headers=headers).status_code == 200
    for collection in ("user_supplements", "supplement_logs", "meals"):
        assert asyncio.run(mock_db[collection].count_documents({"user_id": user_id})) == 0
