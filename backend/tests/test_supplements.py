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


# --- Coach tools -----------------------------------------------------------------
def test_the_coach_lists_supplements_and_ticks_one_off_after_confirm(client, ai_providers):
    from tests.test_coach import say, turn

    headers, _ = _onboard(client, "coachsupps@example.com")
    client.post(f"{API}/supplements/mine", headers=headers,
                json={"supplement_id": "creatine_monohydrate", "dose": "5 g", "timing": "any"})
    ai_providers.gemini = [
        turn("", ("get_my_supplements", {})),
        turn("Ready to tick off creatine.", ("mark_supplement_taken", {"name": "creatine"})),
    ]
    data = say(client, headers, "I took my creatine")
    [proposal] = data["proposals"]
    assert proposal["tool"] == "mark_supplement_taken"
    assert "supplements" in proposal["invalidates"]
    mine = client.get(f"{API}/supplements/mine", headers=headers).json()["data"]
    assert mine[0]["taken_today"] is False  # nothing changes before confirming
    res = client.post(f"{API}/coach/actions/{proposal['id']}/confirm", headers=headers)
    assert res.status_code == 200, res.text
    mine = client.get(f"{API}/supplements/mine", headers=headers).json()["data"]
    assert mine[0]["taken_today"] is True


def test_the_coach_gets_catalogue_facts_not_guesses(client, ai_providers):
    from tests.test_coach import say, turn

    headers, _ = _onboard(client, "coachinfo@example.com")
    ai_providers.gemini = [turn("", ("get_supplement_info", {"supplement_id": "vitamin_d3"})), turn("Here you go.")]
    say(client, headers, "should I take vitamin D?")
    second_prompt = [c["prompt"] for c in ai_providers.calls if "RepEat's coach" in (c["system"] or "")][-1]
    assert "typical_dose" in second_prompt and "not a prescription" in second_prompt


# --- Reminders -------------------------------------------------------------------
def test_supplement_reminders_are_pushed_once_and_can_be_turned_off(monkeypatch):
    from zoneinfo import ZoneInfo

    from app.config.settings import get_settings
    from app.models import push as push_store
    from app.services import push_service, reminder_service

    settings = get_settings()
    monkeypatch.setattr(settings, "VAPID_PUBLIC_KEY", "BTestPublicKey")
    monkeypatch.setattr(settings, "VAPID_PRIVATE_KEY", "test-private-key")
    monkeypatch.setattr(settings, "VAPID_SUBJECT", "mailto:team@example.com")
    sent = []
    monkeypatch.setattr(push_service, "_send_one", lambda sub, payload: sent.append(payload))

    async def scenario():
        user = User(email="suppremind@example.com", password_hash="x", timezone_name="Asia/Kolkata")
        await user.save()
        await push_store.save_subscription(user.id, "https://push.example.com/s/1",
                                           {"p256dh": "BKey", "auth": "auth"})
        await supplement_service.add_supplement(user.id, {"supplement_id": "vitamin_d3", "dose": "1000 IU",
                                                          "timing": "any", "reminder_time": "08:00"})
        now = datetime(2026, 11, 15, 8, 10, tzinfo=ZoneInfo("Asia/Kolkata"))
        first = await reminder_service.run_for_user(user, now)
        again = await reminder_service.run_for_user(user, now)
        await reminder_service.update_settings(user.id, {"supplements": False})
        user2 = User(email="suppremind2@example.com", password_hash="x", timezone_name="Asia/Kolkata")
        await user2.save()
        await push_store.save_subscription(user2.id, "https://push.example.com/s/2",
                                           {"p256dh": "BKey", "auth": "auth"})
        await supplement_service.add_supplement(user2.id, {"supplement_id": "vitamin_d3", "dose": "1000 IU",
                                                           "timing": "any", "reminder_time": "08:00"})
        await reminder_service.update_settings(user2.id, {"supplements": False})
        off = await reminder_service.run_for_user(user2, now)
        return first, again, off

    first, again, off = asyncio.run(scenario())
    assert first == 1 and again == 0 and off == 0
    assert any("Vitamin" in p or "vitamin" in p for p in sent)


def test_steroids_hormones_and_drugs_are_never_tracked_but_strength_words_are_fine(client):
    from app.services.supplement_service import _is_blocked

    for name in ("Testosterone booster", "Dianabol 10mg", "HGH", "Clen", "Ostarine (SARM)", "fat burner pro",
                 "Trenbolone", "insulin", "BPC-157 peptide", "T3 cutting"):
        assert _is_blocked(name), name
    for name in ("Strength protein", "Trend whey", "Creatine monohydrate", "Vitamin D3", "Electrolyte mix",
                 "Peanut butter protein"):
        assert not _is_blocked(name), name
    headers, _ = _onboard(client, "blockedmore@example.com")
    res = client.post(f"{API}/supplements/mine", headers=headers, json={"name": "Dianabol", "dose": "", "timing": "any"})
    assert res.status_code == 400 and "doctor" in res.json()["message"]


# --- Suggestions come from the person, not from selling --------------------------
def test_protein_powder_is_only_suggested_when_logged_meals_fall_short():
    from app.health import supplement_rules as rules

    targets = {"protein": 120}
    covered = rules.reasons("whey_protein", set(), {}, "muscle_gain", targets, {}, 4, 24,
                            intake={"avg_protein": 115, "days": 5})
    short = rules.reasons("whey_protein", set(), {}, "muscle_gain", targets, {}, 4, 24,
                          intake={"avg_protein": 70, "days": 5})
    unknown = rules.reasons("whey_protein", set(), {}, "muscle_gain", targets, {}, 4, 24)
    assert covered == []  # food already covers it: nothing to suggest
    assert "averaged 70 g" in short[0]
    assert "Log a few days" in unknown[0]


def test_vitamin_d_suggests_a_blood_test_for_indoor_days_without_a_result():
    from app.health import supplement_rules as rules

    indoor = rules.reasons("vitamin_d3", set(), {}, "maintain", None, {}, 0, None, activity="sedentary")
    active = rules.reasons("vitamin_d3", set(), {}, "maintain", None, {}, 0, None, activity="very_active")
    assert "blood test" in indoor[0] and active == []


def test_steroids_hormones_and_fat_burners_are_never_tracked(client):
    headers, _ = _onboard(client, "nosteroids@example.com")
    for name in ("Trenbolone", "Test booster", "HGH", "Clen", "Fat burner XT", "Insulin"):
        res = client.post(f"{API}/supplements/mine", headers=headers, json={"name": name})
        assert res.status_code == 400, name
        assert "everyday supplements" in res.json()["message"]
    for name in ("Strength greens", "Trending multivitamin", "Mass gainer"):
        assert client.post(f"{API}/supplements/mine", headers=headers, json={"name": name}).status_code == 200


# --- Essentials: the bare minimum, within a budget, no brands -------------------
def test_essentials_are_few_relevant_and_within_budget(client):
    headers, _ = _onboard(client, "essentials@example.com", fitness_goal="muscle_gain", workout_days_per_week=4,
                          food_preferences={"diet_type": "vegetarian"}, activity_level="sedentary")
    data = client.get(f"{API}/supplements/essentials?budget=1000", headers=headers).json()["data"]
    assert 0 < len(data["picks"]) <= 3
    assert data["total_inr"] <= 1000
    ids = [p["id"] for p in data["picks"]]
    assert ids[0] == "creatine_monohydrate"  # cheap, strong evidence, and vegetarians get none from food
    assert "caffeine" not in ids and "ashwagandha" not in ids
    for pick in data["picks"]:
        assert pick["why"] and pick["food_first"] and pick["india_gap"]  # Indian by default
    # Nothing to spend: food first, nothing picked.
    zero = client.get(f"{API}/supplements/essentials?budget=0", headers=headers).json()["data"]
    assert zero["picks"] == [] and zero["later"]


def test_essentials_skip_the_india_note_for_other_countries(client):
    headers, _ = _onboard(client, "abroad@example.com", food_preferences={"diet_type": "vegetarian"})
    client.put(f"{API}/users/personalisation", headers=headers, json={"food_access": {"country": "Canada"}})
    data = client.get(f"{API}/supplements/essentials?budget=2000", headers=headers).json()["data"]
    assert data["india"] is False
    assert all(p["india_gap"] is None for p in data["picks"] + data["later"])


def test_a_product_label_is_estimated_and_checked(client, ai_providers):
    headers, _ = _onboard(client, "label@example.com")
    ai_providers.gemini = [
        # Inconsistent first answer (calories don't add up), then a sensible one.
        json.dumps({"serving_label": "1 scoop (35 g)", "serving_g": 35, "calories": 400, "protein": 25,
                    "carbs": 3, "fats": 2, "adds_nutrition": True, "confidence": "medium", "note": ""}),
        json.dumps({"serving_label": "1 scoop (35 g)", "serving_g": 35, "calories": 130, "protein": 25,
                    "carbs": 3, "fats": 2, "adds_nutrition": True, "confidence": "medium", "note": ""}),
    ]
    res = client.post(f"{API}/supplements/estimate", headers=headers, json={"product": "Some brand whey 2 kg"})
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["protein"] == 25 and data["estimated"] is True
    blocked = client.post(f"{API}/supplements/estimate", headers=headers, json={"product": "Trenbolone"})
    assert blocked.status_code == 400


def test_a_brand_name_is_read_as_the_supplement_being_tracked(client, ai_providers):
    headers, _ = _onboard(client, "typed@example.com")
    # Creatine: whatever the model says, it carries no calories.
    ai_providers.gemini = [json.dumps({"serving_label": "5 g", "serving_g": 5, "calories": 20, "protein": 5,
                                       "carbs": 0, "fats": 0, "adds_nutrition": True, "confidence": "high",
                                       "note": "", "matches_type": True})]
    res = client.post(f"{API}/supplements/estimate", headers=headers,
                      json={"product": "Wellcore", "supplement_id": "creatine_monohydrate"})
    data = res.json()["data"]
    assert data["serving_label"] == "5 g" and data["protein"] == 0 and data["adds_nutrition"] is False
    assert data["type_name"] == "Creatine monohydrate"
    assert "Creatine monohydrate" in ai_providers.calls[-1]["prompt"]
    # A creatine product typed into the whey dialog is flagged, not filled.
    ai_providers.gemini = [json.dumps({"serving_label": "3 g", "serving_g": 3, "calories": 0, "protein": 0,
                                       "carbs": 0, "fats": 0, "adds_nutrition": False, "confidence": "medium",
                                       "note": "this is a creatine product", "matches_type": False})]
    res = client.post(f"{API}/supplements/estimate", headers=headers,
                      json={"product": "Wellcore creatine 250 g", "supplement_id": "whey_protein"})
    assert res.json()["data"]["matches_type"] is False


# --- Supplements in the meal plan, and when to take them --------------------------
def test_whey_is_part_of_the_plan_and_shrinks_the_food_around_it(client, ai_providers):
    headers, _ = _onboard(client, "planwhey@example.com", fitness_goal="muscle_gain", workout_days_per_week=4,
                          workout_time="early_morning", food_preferences={"diet_type": "vegetarian"})
    client.post(f"{API}/supplements/mine", headers=headers, json={
        "supplement_id": "whey_protein", "dose": "1 scoop (30 g)", "timing": "post_workout",
        "macros_per_serving": {"calories": 120, "protein": 24, "carbs": 3, "fats": 1.5}})
    client.post(f"{API}/supplements/mine", headers=headers,
                json={"supplement_id": "creatine_monohydrate", "dose": "5 g", "timing": "post_workout"})
    plan = client.post(f"{API}/diet-plans", headers=headers).json()["data"]
    post = next(m for m in plan["meals"] if m.get("workout_role") == "post")
    whey = [i for i in post["items"] if i["source"] == "supplement"]
    assert len(whey) == 1 and whey[0]["nutrients"]["protein"] == 24
    assert [s["name"] for s in post["supplements"]] == ["Creatine monohydrate"]
    assert plan["stale"] is False

    # Logging that meal ticks the whey off; its protein is counted once.
    res = client.post(f"{API}/diet-plans/current/meals/{post['id']}/log", headers=headers)
    assert res.status_code == 200, res.text
    assert "Whey" not in res.json()["data"]["meal"]["name"]
    mine = {s["name"]: s for s in client.get(f"{API}/supplements/mine", headers=headers).json()["data"]}
    assert mine["Whey protein"]["taken_today"] is True
    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    whey_meals = [m for m in today["meals"] if m["name"] == "Whey protein"]
    assert len(whey_meals) == 1

    # Creatine ticked off on its own: the plan shows it as taken, not as a to-do.
    client.post(f"{API}/supplements/mine/{mine['Creatine monohydrate']['id']}/taken", headers=headers,
                json={"taken": True})
    current = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    post_now = next(m for m in current["meals"] if m["id"] == post["id"])
    assert post_now["supplements"][0]["taken_today"] is True
    assert next(i for i in post_now["items"] if i["source"] == "supplement")["taken_today"] is True

    # Stopping a supplement makes the plan stale (it was made with it).
    client.delete(f"{API}/supplements/mine/{mine['Creatine monohydrate']['id']}", headers=headers)
    assert client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]["stale"] is True


def test_best_times_group_supplements_into_as_few_steps_as_possible(client):
    headers, _ = _onboard(client, "routine@example.com", workout_days_per_week=4, workout_time="early_morning")
    catalog = _catalog(client, headers)
    assert catalog["creatine_monohydrate"]["suggested_timing"] == "post_workout"
    assert catalog["whey_protein"]["suggested_timing"] == "post_workout"
    assert catalog["vitamin_d3"]["suggested_timing"] == "with_lunch"
    assert "fat-soluble" in catalog["vitamin_d3"]["timing_reason"]
    for sid, timing in (("creatine_monohydrate", "bedtime"), ("vitamin_d3", "with_lunch")):
        client.post(f"{API}/supplements/mine", headers=headers, json={"supplement_id": sid, "dose": "", "timing": timing})
    groups = client.get(f"{API}/supplements/routine", headers=headers).json()["data"]["groups"]
    by_slot = {g["slot"]: g for g in groups}
    assert by_slot["lunch"]["items"][0]["name"] == "Vitamin D3" and by_slot["lunch"]["items"][0]["suggestion"] is None
    creatine = next(i for g in groups for i in g["items"] if i["name"].startswith("Creatine"))
    assert creatine["suggestion"]["timing"] == "post_workout"  # fold it into the post-workout step
