import asyncio

from app.models import audit
from app.utils.helpers import calculate_tdee
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"


def test_onboarding_stores_injuries_and_activity_level(client):
    headers, _ = register_and_login(client)
    payload = {**ONBOARDING, "injuries": ["Lower back", " lower back ", "Left knee"], "activity_level": "light"}
    res = client.post(f"{API}/users/onboarding", headers=headers, json=payload)
    assert res.status_code == 200

    profile = client.get(f"{API}/users/profile", headers=headers).json()["data"]
    # Trimmed and de-duplicated ignoring case; the first spelling is kept.
    assert profile["injuries"] == ["Lower back", "Left knee"]
    assert profile["activity_level"] == "light"
    assert profile["tdee"] == calculate_tdee(70, 175, 28, "male", "light")


def test_onboarding_defaults_to_moderate_activity(client):
    headers, _ = register_and_login(client)
    client.post(f"{API}/users/onboarding", headers=headers, json=ONBOARDING)
    profile = client.get(f"{API}/users/profile", headers=headers).json()["data"]
    assert profile["tdee"] == calculate_tdee(70, 175, 28, "male", "moderate")


def test_impossible_measurements_are_rejected_not_500(client):
    headers, _ = register_and_login(client)
    for field, value in [("height_cm", 0), ("weight_kg", -5), ("age", 7), ("gender", "robot")]:
        res = client.post(f"{API}/users/onboarding", headers=headers, json={**ONBOARDING, field: value})
        assert res.status_code == 422, field
        assert res.json()["success"] is False


def test_profile_changes_are_audited(client):
    headers, user_id = register_and_login(client)
    client.post(f"{API}/users/onboarding", headers=headers, json=ONBOARDING)
    client.put(f"{API}/users/profile", headers=headers, json={"weight_kg": 72})

    entries = asyncio.run(audit.get_history(user_id, entity="profile"))
    assert [e["action"] for e in entries] == ["update", "onboarding"]
    latest = entries[0]
    assert latest["actor"] == audit.ACTOR_USER
    assert latest["before"]["weight_kg"] == 70
    assert latest["after"]["weight_kg"] == 72
    assert "weight_kg" in latest["changed_fields"]
