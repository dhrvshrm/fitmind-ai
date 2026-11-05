import asyncio

import pytest

from app.config import database
from app.nutrition.targets import TargetInputs, calculate_targets, canonical_goal
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"


def targets(**overrides):
    base = dict(age=28, gender="male", weight_kg=70, height_cm=175, goal="maintain", activity_level="moderate")
    return calculate_targets(TargetInputs(**{**base, **overrides}))


def test_mifflin_st_jeor_and_activity_factor():
    t = targets()
    # 10*70 + 6.25*175 - 5*28 + 5 = 1658.75; x1.55 = 2571
    assert t.bmr == 1659
    assert t.tdee == 2571
    assert t.calories == t.tdee
    assert t.adjustment_kcal == 0


def test_body_fat_switches_to_katch_mcardle():
    t = targets(body_fat_percent=15)
    lean = 70 * 0.85
    assert t.bmr == round(370 + 21.6 * lean)
    assert t.notes[0].code == "bmr_katch"


def test_macros_add_up_to_calories():
    for goal in ("fat_loss", "muscle_gain", "recomposition", "maintain", "athletic_performance"):
        t = targets(goal=goal)
        from_macros = 4 * t.protein + 4 * t.carbs + 9 * t.fats
        assert abs(from_macros - t.calories) <= 10, goal


@pytest.mark.parametrize("pace, share", [("gentle", 0.10), ("moderate", 0.20)])
def test_fat_loss_deficit_by_pace(pace, share):
    t = targets(goal="fat_loss", pace=pace, weight_kg=90)
    assert t.adjustment_kcal == -round(t.tdee * share)


def test_fat_loss_capped_at_one_percent_of_body_weight_per_week():
    t = targets(goal="fat_loss", pace="aggressive", weight_kg=60, activity_level="very_active")
    max_daily = 60 * 0.01 * 7700 / 7
    assert -t.adjustment_kcal <= max_daily + 1
    assert "deficit_capped" in t.flags


def test_muscle_gain_surplus_is_capped():
    t = targets(goal="muscle_gain", pace="aggressive", activity_level="very_active", weight_kg=95)
    assert 0 < t.adjustment_kcal <= 500


def test_calories_never_below_safe_floor():
    t = targets(goal="fat_loss", pace="aggressive", gender="female", weight_kg=45, height_cm=150,
                age=40, activity_level="sedentary")
    assert t.calories == 1200
    assert "calorie_floor" in t.flags


def test_no_deficit_for_under_18s():
    t = targets(goal="fat_loss", age=16)
    assert t.adjustment_kcal == 0
    assert "no_deficit_minor" in t.flags
    assert t.protein_per_kg == 1.0


@pytest.mark.parametrize("status", ["pregnant", "breastfeeding"])
def test_no_deficit_or_surplus_when_pregnant_or_breastfeeding(status):
    loss = targets(goal="fat_loss", gender="female", reproductive_status=status)
    gain = targets(goal="muscle_gain", gender="female", reproductive_status=status)
    assert loss.adjustment_kcal == 0 and gain.adjustment_kcal == 0
    assert loss.protein_per_kg == 1.2


def test_protein_uses_reference_weight_at_high_bmi():
    t = targets(goal="fat_loss", weight_kg=120, height_cm=170)
    reference = 25 * 1.7 ** 2
    assert t.protein == round(1.8 * reference)
    assert "protein_reference_weight" in t.flags


def test_protein_stays_within_safe_range():
    for goal in ("fat_loss", "muscle_gain", "recomposition", "maintain"):
        t = targets(goal=goal)
        assert 0.83 <= t.protein_per_kg <= 2.2


def test_unknown_activity_is_flagged_not_hidden():
    t = targets(activity_level=None)
    assert "activity_assumed" in t.flags


def test_legacy_goal_ids_are_mapped():
    assert canonical_goal("lose_weight") == "fat_loss"
    assert canonical_goal("build_muscle") == "muscle_gain"
    assert canonical_goal("improve_endurance") == "athletic_performance"
    assert canonical_goal(None) == "general_fitness"
    assert canonical_goal("something_else") == "general_fitness"


# --- API ---------------------------------------------------------------------

def test_onboarding_saves_answers_and_targets_drive_nutrition_goals(client):
    headers, _ = register_and_login(client)
    payload = {
        **ONBOARDING,
        "fitness_goal": "fat_loss",
        "goal_pace": "gentle",
        "activity_level": "light",
        "workout_days_per_week": 4,
        "food_preferences": {"diet_type": "vegetarian", "eats_dairy": True, "allergies": ["Peanuts"]},
        "food_access": {"who_cooks": "family", "daily_budget_inr": 250, "pantry": ["atta", "dal", "paneer"]},
        "lifestyle": {"wake_time": "06:30", "sleep_time": "23:00", "work_schedule": "day"},
    }
    res = client.post(f"{API}/users/onboarding", headers=headers, json=payload)
    assert res.status_code == 200, res.text
    targets_data = res.json()["data"]["targets"]
    assert targets_data["goal"] == "fat_loss" and targets_data["adjustment_kcal"] < 0

    profile = client.get(f"{API}/users/profile", headers=headers).json()["data"]
    assert profile["food_preferences"]["diet_type"] == "vegetarian"
    assert profile["food_access"]["daily_budget_inr"] == 250
    assert profile["lifestyle"]["wake_time"] == "06:30"

    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    assert today["goals"]["calories"] == targets_data["calories"]
    assert today["goals"]["protein"] == targets_data["protein"]
    assert today["water_goal_ml"] == targets_data["water_ml"]
    assert today["targets"]["notes"]


def test_personalisation_merges_sections_without_erasing_answers(client):
    headers, _ = register_and_login(client)
    client.post(f"{API}/users/onboarding", headers=headers, json={
        **ONBOARDING, "food_preferences": {"diet_type": "vegetarian", "cuisines": ["Punjabi"]},
    })
    res = client.put(f"{API}/users/personalisation", headers=headers,
                     json={"food_preferences": {"dislikes": ["Karela"]}})
    prefs = res.json()["data"]["food_preferences"]
    assert prefs == {"diet_type": "vegetarian", "cuisines": ["Punjabi"], "dislikes": ["Karela"]}


def test_changing_goal_or_weight_recomputes_targets(client):
    headers, _ = register_and_login(client)
    client.post(f"{API}/users/onboarding", headers=headers, json={**ONBOARDING, "fitness_goal": "maintain"})
    before = client.get(f"{API}/users/targets", headers=headers).json()["data"]["targets"]

    client.put(f"{API}/settings/goals", headers=headers, json={"fitness_goal": "fat_loss"})
    after_goal = client.get(f"{API}/users/targets", headers=headers).json()["data"]["targets"]
    assert after_goal["calories"] < before["calories"]

    client.put(f"{API}/users/profile", headers=headers, json={"weight_kg": 80})
    after_weight = client.get(f"{API}/users/targets", headers=headers).json()["data"]["targets"]
    assert after_weight["protein"] > after_goal["protein"]


def test_preview_does_not_save(client):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/users/targets/preview", headers=headers, json={
        "age": 30, "gender": "female", "weight_kg": 60, "height_cm": 160, "fitness_goal": "muscle_gain",
        "activity_level": "active", "goal_pace": "gentle",
    })
    assert res.json()["data"]["targets"]["adjustment_kcal"] > 0
    assert client.get(f"{API}/users/targets", headers=headers).json()["data"]["targets"] is None


def test_existing_users_get_targets_and_goal_migrated(client, mock_db):
    """Users onboarded before v2 have a legacy goal and no targets; both are handled on read."""
    headers, user_id = register_and_login(client)

    async def make_legacy():
        await database.db["users"].update_one({"id": user_id}, {"$set": {
            "age": 30, "gender": "male", "weight_kg": 80, "height_cm": 178,
            "fitness_goal": "lose_weight", "onboarding_completed": True, "targets": None,
        }})

    asyncio.run(make_legacy())
    profile = client.get(f"{API}/users/profile", headers=headers).json()["data"]
    assert profile["fitness_goal"] == "fat_loss"
    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    assert today["targets"]["goal"] == "fat_loss"
    assert today["goals"]["calories"] < today["targets"]["tdee"]


def test_invalid_answers_are_rejected(client):
    headers, _ = register_and_login(client)
    for bad in [
        {"lifestyle": {"wake_time": "7am"}},
        {"food_access": {"daily_budget_inr": -5}},
        {"food_preferences": {"diet_type": "carnivore"}},
        {"body_fat_percent": 80},
    ]:
        res = client.put(f"{API}/users/personalisation", headers=headers, json=bad)
        assert res.status_code == 422, bad
