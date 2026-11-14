import asyncio

import pytest

from app.config.settings import Settings, get_settings
from app.health import crypto, plan_rules
from app.models import health_profile as profile_model
from app.nutrition.food_db import Food, Nutrients, Serving
from app.services import consent_service, health_profile_service
from tests.conftest import ONBOARDING, register_and_login
from tests.health_helpers import API, grant, use_encryption_key

PROFILE = {
    "conditions": [
        {"key": "diabetes", "details": {"type": "type2", "on_medication": True, "uses_insulin": False}},
        {"key": "hypertension", "details": {"on_medication": False}},
    ],
    "medications": "Metformin 500 mg twice a day",
    "other_conditions": "Migraine",
}


# --- Consent --------------------------------------------------------------------
def test_health_profile_needs_consent_first(client):
    headers, user_id = register_and_login(client)
    res = client.put(f"{API}/health-profile", headers=headers, json=PROFILE)
    assert res.status_code == 403
    assert res.json()["success"] is False
    view = client.get(f"{API}/health-profile", headers=headers).json()["data"]
    assert view == {"consented": False, "profile": None, "plan_effects": []}


def test_consent_is_versioned_and_listed(client):
    headers, user_id = register_and_login(client)
    status = grant(client, headers, "health_profile")
    profile_status = next(s for s in status if s["scope"] == "health_profile")
    assert profile_status["granted"] is True
    assert profile_status["version"] == consent_service.CONSENT_VERSIONS["health_profile"]
    assert profile_status["granted_at"]
    reports_status = next(s for s in status if s["scope"] == "health_reports")
    assert reports_status["granted"] is False
    assert asyncio.run(consent_service.has_consent(user_id, "health_profile")) is True
    assert asyncio.run(consent_service.has_consent(user_id, "health_reports")) is False


def test_a_new_consent_version_asks_again(client, monkeypatch):
    headers, user_id = register_and_login(client)
    grant(client, headers, "health_profile")
    monkeypatch.setitem(consent_service.CONSENT_VERSIONS, "health_profile", 2)
    assert asyncio.run(consent_service.has_consent(user_id, "health_profile")) is False
    assert client.put(f"{API}/health-profile", headers=headers, json=PROFILE).status_code == 403


def test_withdrawing_consent_deletes_the_profile(client):
    headers, user_id = register_and_login(client)
    grant(client, headers, "health_profile")
    assert client.put(f"{API}/health-profile", headers=headers, json=PROFILE).status_code == 200

    res = client.delete(f"{API}/consents/health_profile", headers=headers)
    assert res.status_code == 200
    assert res.json()["data"]["deleted"] == 1
    assert asyncio.run(profile_model.get_raw(user_id)) is None
    view = client.get(f"{API}/health-profile", headers=headers).json()["data"]
    assert view["consented"] is False and view["profile"] is None
    # Granting again starts from a blank profile.
    grant(client, headers, "health_profile")
    assert client.get(f"{API}/health-profile", headers=headers).json()["data"]["profile"] is None


# --- Questionnaire --------------------------------------------------------------
def test_profile_is_saved_with_provenance_and_conditional_follow_ups(client):
    headers, _ = register_and_login(client)
    grant(client, headers, "health_profile")
    res = client.put(f"{API}/health-profile", headers=headers, json=PROFILE)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    profile = data["profile"]
    diabetes = next(c for c in profile["conditions"] if c["key"] == "diabetes")
    # "Uses insulin" only applies when on medication; it was answered, so it's kept.
    assert diabetes["details"] == {"type": "type2", "on_medication": True, "uses_insulin": False}
    assert diabetes["provenance"] == "self_reported"
    assert diabetes["recorded_at"]
    assert profile["medications"]["value"] == "Metformin 500 mg twice a day"
    assert profile["medications"]["provenance"] == "self_reported"
    assert profile["other_conditions"]["value"] == "Migraine"
    assert set(data["plan_effects"]) == {"blood_sugar", "blood_pressure"}


def test_follow_ups_that_dont_apply_are_dropped(client):
    headers, _ = register_and_login(client)
    grant(client, headers, "health_profile")
    payload = {"conditions": [
        {"key": "diabetes", "details": {"type": "type2", "on_medication": False, "uses_insulin": True}},
        {"key": "pregnancy", "details": {"status": "breastfeeding", "trimester": "second"}},
    ]}
    profile = client.put(f"{API}/health-profile", headers=headers, json=payload).json()["data"]["profile"]
    by_key = {c["key"]: c["details"] for c in profile["conditions"]}
    assert by_key["diabetes"] == {"type": "type2", "on_medication": False}
    assert by_key["pregnancy"] == {"status": "breastfeeding"}


def test_invalid_answers_are_rejected(client):
    headers, _ = register_and_login(client)
    grant(client, headers, "health_profile")
    bad_option = {"conditions": [{"key": "thyroid", "details": {"type": "sometimes"}}]}
    assert client.put(f"{API}/health-profile", headers=headers, json=bad_option).status_code == 400
    unknown = {"conditions": [{"key": "flu", "details": {}}]}
    assert client.put(f"{API}/health-profile", headers=headers, json=unknown).status_code == 422


def test_unchanged_answers_keep_their_original_record(client):
    headers, user_id = register_and_login(client)
    grant(client, headers, "health_profile")
    client.put(f"{API}/health-profile", headers=headers, json=PROFILE)
    stored = asyncio.run(profile_model.get(user_id))
    stored["conditions"][0]["recorded_at"] = "2025-01-01"
    stored["medications"]["recorded_at"] = "2025-01-01"
    asyncio.run(profile_model.save(user_id, {k: v for k, v in stored.items() if k != "updated_at"}))

    changed = {**PROFILE, "medications": "Metformin 1000 mg"}
    profile = client.put(f"{API}/health-profile", headers=headers, json=changed).json()["data"]["profile"]
    assert profile["conditions"][0]["recorded_at"] == "2025-01-01"
    assert profile["medications"]["recorded_at"] != "2025-01-01"


# --- Encryption -----------------------------------------------------------------
def test_profile_is_encrypted_at_rest_when_a_key_is_set(client, monkeypatch):
    use_encryption_key(monkeypatch)
    headers, user_id = register_and_login(client)
    grant(client, headers, "health_profile")
    client.put(f"{API}/health-profile", headers=headers, json=PROFILE)

    raw = asyncio.run(profile_model.get_raw(user_id))
    assert isinstance(raw["data"], str) and raw["data"].startswith(crypto.PREFIX)
    assert "Metformin" not in raw["data"] and "diabetes" not in raw["data"]
    profile = client.get(f"{API}/health-profile", headers=headers).json()["data"]["profile"]
    assert profile["medications"]["value"] == "Metformin 500 mg twice a day"


def test_crypto_roundtrip_and_plaintext_fallback(monkeypatch):
    value = {"medications": "Levothyroxine", "n": [1, 2]}
    assert crypto.encrypt(value) == value  # No key in development: stored as is.
    use_encryption_key(monkeypatch)
    token = crypto.encrypt(value)
    assert token.startswith(crypto.PREFIX)
    assert crypto.decrypt(token) == value
    assert crypto.decrypt({"plain": True}) == {"plain": True}
    assert crypto.decrypt_bytes(crypto.encrypt_bytes(b"pdf"), True) == b"pdf"


def test_encrypted_data_without_the_key_is_an_error(monkeypatch):
    use_encryption_key(monkeypatch)
    token = crypto.encrypt({"x": 1})
    monkeypatch.setattr(get_settings(), "HEALTH_DATA_KEY", "")
    with pytest.raises(crypto.HealthCryptoError):
        crypto.decrypt(token)


def test_production_requires_a_health_data_key():
    settings = Settings(DATABASE_ENV="production", JWT_SECRET="x" * 48,
                        CORS_EXTRA_ORIGINS="https://fitmind.example", HEALTH_DATA_KEY="")
    with pytest.raises(RuntimeError) as exc:
        settings.validate_for_production()
    assert "HEALTH_DATA_KEY" in str(exc.value)


# --- Health context and plan rules ----------------------------------------------
def test_health_context_is_short_factual_and_consented_only(client):
    headers, user_id = register_and_login(client)
    assert asyncio.run(health_profile_service.health_context(user_id)) == ""
    grant(client, headers, "health_profile")
    client.put(f"{API}/health-profile", headers=headers, json=PROFILE)
    context = asyncio.run(health_profile_service.health_context(user_id))
    assert "diabetes (type 2, on medication)" in context
    assert "high blood pressure" in context
    assert "Metformin" in context
    assert "not a diagnosis" in context
    client.delete(f"{API}/consents/health_profile", headers=headers)
    assert asyncio.run(health_profile_service.health_context(user_id)) == ""


def _food(name):
    return Food(id=f"t:{name}", name=name, source="INDB", per_100g=Nutrients(kcal=100),
                serving=Serving(unit="bowl", grams=100))


def test_blood_sugar_rules_leave_out_refined_foods():
    pool = [_food(n) for n in ("Moong dal", "Brown rice", "Butter naan", "Sugar syrup", "Vegetable poha", "Roti")]
    kept = {f.name for f in plan_rules.filter_pool(pool, {"diabetes"})}
    assert kept == {"Moong dal", "Brown rice", "Vegetable poha", "Roti"}
    assert plan_rules.filter_pool(pool, set()) == pool


def test_kidney_rules_cap_protein_and_pregnancy_blocks_a_deficit():
    targets = {"calories": 1800, "protein": 140, "carbs": 180, "fats": 55, "tdee": 2300, "flags": []}
    kidney = plan_rules.adjust_targets(targets, {"kidney", "ckd"}, 70)
    assert kidney["protein"] == 56
    assert kidney["carbs"] == 180 + 84
    assert plan_rules.adjust_targets(targets, {"kidney", "ckd", "dialysis"}, 70)["protein"] == 140

    pregnant = plan_rules.adjust_targets(targets, {"pregnancy", "pregnant"}, 70)
    assert pregnant["calories"] == 2300
    assert "pregnancy_or_breastfeeding" in pregnant["flags"]
    codes = [n["code"] for n in plan_rules.plan_notes({"pregnancy", "kidney"})]
    assert codes == ["health_adjusted", "medical_advice"]


def test_meal_plans_follow_the_health_profile(client, ai_providers):
    headers, _ = register_and_login(client)
    client.post(f"{API}/users/onboarding", headers=headers,
                json={**ONBOARDING, "fitness_goal": "fat_loss", "weight_kg": 80})
    grant(client, headers, "health_profile")
    client.put(f"{API}/health-profile", headers=headers, json={"conditions": [
        {"key": "kidney", "details": {"type": "ckd", "under_care": True}},
        {"key": "hypertension", "details": {}},
    ]})
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    assert plan["targets"]["protein"] <= 64  # 0.8 g/kg x 80 kg
    codes = {n["code"] for n in plan["notes"]}
    assert {"health_adjusted", "medical_advice"} <= codes
    health = next(n for n in plan["notes"] if n["code"] == "health_adjusted")
    assert health["values"] == {"blood_pressure": 1, "kidney": 1}
    # The plan was made with adjusted targets, so it isn't immediately "stale".
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]["stale"] is False


def test_account_deletion_removes_health_profile_and_consents(client, mock_db):
    headers, user_id = register_and_login(client)
    grant(client, headers, "health_profile")
    client.put(f"{API}/health-profile", headers=headers, json=PROFILE)
    res = client.delete(f"{API}/settings/account", headers=headers)
    assert res.status_code == 200, res.text
    assert asyncio.run(mock_db["health_profiles"].count_documents({"user_id": user_id})) == 0
    assert asyncio.run(mock_db["consents"].count_documents({"user_id": user_id})) == 0


# --- Coach context ----------------------------------------------------------------
def test_coach_context_includes_consented_health_details_only(client):
    from app.coach import registry

    headers, user_id = register_and_login(client)
    assert "Health context" not in asyncio.run(registry.build_context(user_id))

    grant(client, headers, "health_profile")
    assert client.put(f"{API}/health-profile", headers=headers, json=PROFILE).status_code == 200
    context = asyncio.run(registry.build_context(user_id))
    assert "Health context" in context
    assert "diabetes (type 2, on medication)" in context
    assert "Metformin" in context
    assert "not a diagnosis" in context

    client.delete(f"{API}/consents/health_profile", headers=headers)
    assert "Health context" not in asyncio.run(registry.build_context(user_id))
