from datetime import date

import pytest

from app.services import workout_service
from app.workouts import catalog, planner, programming
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"
MONDAY = date(2026, 11, 9)


def _onboard(client, email="lifter@example.com", **overrides):
    headers, user_id = register_and_login(client, email)
    client.post(f"{API}/users/onboarding", headers=headers, json={**ONBOARDING, **overrides})
    return headers, user_id


def _generate(client, headers):
    res = client.post(f"{API}/workouts/generate", headers=headers, json={})
    assert res.status_code == 200, res.json()
    return res.json()["data"]["weekly_plan"]


def _exercises(plan):
    return [e for day in plan["week"] for e in day["exercises"]]


def _training_days(plan):
    return [d for d in plan["week"] if d["workout_type"] == "strength"]


# --- Catalogue -------------------------------------------------------------------
def test_curated_exercises_are_complete_and_linked():
    curated = catalog.curated()
    assert len(curated) >= 60
    for exercise in curated:
        assert len(exercise.images) == 2, exercise.id
        assert exercise.coaching.steps and exercise.coaching.cues and exercise.coaching.mistakes
        assert exercise.primary_muscles


def test_curated_layer_corrects_source_errors():
    split_squat = catalog.get("Split_Squats")
    assert split_squat.category == "strength"
    assert split_squat.primary_muscles == ["quadriceps", "glutes"]
    # The source's squat text calls knees past toes "incorrect"; curated steps replace it.
    squat = catalog.get("Barbell_Squat").detail()
    assert not any("past your toes" in step for step in squat["instructions"])
    assert squat["images"][0].startswith(catalog.IMAGE_BASE)


def test_injuries_map_to_joints():
    assert catalog.injured_joints(["Lower back", "left knee pain", "Tennis elbow"]) == {
        "lower_back", "knee", "elbow",
    }


def test_equipment_rules():
    goblet = catalog.get("Goblet_Squat")
    assert catalog.has_equipment(goblet, ["kettlebell"])
    assert catalog.has_equipment(goblet, ["dumbbells"])
    assert not catalog.has_equipment(goblet, ["bodyweight"])
    assert catalog.has_equipment(catalog.get("Barbell_Squat"), ["full_gym"])
    assert catalog.has_equipment(catalog.get("Pushups"), [])


# --- Prescriptions ------------------------------------------------------------------
def test_reps_follow_the_goal_and_equipment():
    bench = catalog.get("Dumbbell_Bench_Press")
    assert programming.prescribe(bench, "muscle_gain", "intermediate")["reps"] == "8-12"
    assert programming.prescribe(bench, "athletic_performance", "intermediate")["reps"] == "4-6"
    assert programming.prescribe(bench, "athletic_performance", "intermediate", main_lift=False)["reps"] == "8-12"
    assert programming.prescribe(catalog.get("Pushups"), "athletic_performance", "intermediate")["reps"] == "12-20"
    # Beginners: 3 sets of compound lifts (enough weekly volume), 2 of isolation work.
    assert programming.prescribe(bench, "muscle_gain", "beginner")["sets"] == 3
    assert programming.prescribe(catalog.get("Dumbbell_Bicep_Curl"), "muscle_gain", "beginner")["sets"] == 2
    assert programming.prescribe(catalog.get("Plank"), "fat_loss", "beginner")["reps"] == "20s"
    assert programming.prescribe(catalog.get("One-Arm_Kettlebell_Swings"), "athletic_performance", "expert")["reps"] == "10-15 each side"


def test_low_recovery_lightens_the_day():
    entry = {"sets": 3, "pattern": "squat", "effort": "Stop 2 reps short of failure"}
    assert programming.adjust_for_recovery(entry, 75) == entry
    assert programming.adjust_for_recovery(entry, 50)["sets"] == 2
    assert programming.recovery_mode(30) == "rest"
    assert programming.recovery_mode(None) == "normal"


# --- Weekly plans --------------------------------------------------------------------
def test_plan_is_built_without_ai(client, ai_providers):
    headers, _ = _onboard(client)
    plan = _generate(client, headers)
    assert ai_providers.calls == []
    assert [d["day"] for d in plan["week"]] == planner.DAYS
    assert "ACSM" in plan["meta"]["basis"]
    first = _exercises(plan)[0]
    assert catalog.get(first["exercise_id"]).curated
    assert first["image"] and first["primary_muscles"]


def test_plan_respects_equipment_injuries_and_level(client, ai_providers):
    headers, _ = _onboard(
        client, experience_level="beginner", available_equipment=["bodyweight"], injuries=["Knee"],
    )
    plan = _generate(client, headers)
    for entry in _exercises(plan):
        exercise = catalog.get(entry["exercise_id"])
        assert not exercise.coaching.needs, exercise.id
        assert "knee" not in exercise.coaching.loads, exercise.id
        assert exercise.level == "beginner", exercise.id
    assert {"injury_adjusted", "bodyweight_only", "no_pull_equipment"} <= set(plan["meta"]["notes"])


def test_back_extension_note_only_when_nothing_to_pull_with(client, ai_providers):
    headers, _ = _onboard(client, available_equipment=["dumbbells"], workout_days_per_week=4)
    plan = _generate(client, headers)
    assert "no_pull_equipment" not in plan["meta"]["notes"]
    # Every upper day has a real row (Superman may still appear as core work).
    for day in _training_days(plan):
        if day["focus"] == "Upper body":
            assert any(e["pattern"] in ("pull_horizontal", "pull_vertical") for e in day["exercises"]), day


def test_weights_are_preferred_when_available(client, ai_providers):
    headers, _ = _onboard(client, available_equipment=["dumbbells", "bench"])
    plan = _generate(client, headers)
    squats = [e for e in _exercises(plan) if e["pattern"] == "squat"]
    assert squats and catalog.get(squats[0]["exercise_id"]).coaching.needs


def test_training_days_follow_the_routine_answer(client, ai_providers):
    headers, _ = _onboard(client, workout_days_per_week=4, available_equipment=["full_gym"])
    plan = _generate(client, headers)
    assert [d["focus"] for d in _training_days(plan)] == ["Upper body", "Lower body", "Upper body", "Lower body"]
    # Every major muscle group is trained at least twice a week (ACSM).
    for muscles in (["chest"], ["quadriceps"], ["lats", "middle back"]):
        days = [d for d in _training_days(plan) if any(set(muscles) & set(e["primary_muscles"]) for e in d["exercises"])]
        assert len(days) >= 2, muscles
    assert plan["meta"]["weekly_sets"]["quadriceps"] >= 6


def test_a_new_plan_rotates_exercises(client, ai_providers):
    headers, _ = _onboard(client, available_equipment=["full_gym"])
    first = _generate(client, headers)
    second = _generate(client, headers)
    assert second["meta"]["variant"] == first["meta"]["variant"] + 1
    assert [e["exercise_id"] for e in _exercises(first)] != [e["exercise_id"] for e in _exercises(second)]


def test_sessions_fit_the_time_budget():
    plan = planner.build_week(goal="athletic_performance", experience="advanced", equipment=["full_gym"],
                              injuries=[], days_per_week=6)
    for day in _training_days(plan):
        assert planner._minutes(day["exercises"]) <= planner.SESSION_MINUTES["expert"]


# --- Today ---------------------------------------------------------------------------
@pytest.fixture
def monday(monkeypatch):
    monkeypatch.setattr(workout_service, "local_today", lambda *a, **k: MONDAY)


def test_today_is_lighter_or_mobility_on_low_recovery(client, ai_providers, monday):
    headers, _ = _onboard(client, workout_days_per_week=3)
    plan = _generate(client, headers)
    planned = plan["week"][0]["exercises"]

    today = client.get(f"{API}/workouts/plan/today", headers=headers).json()["data"]
    # Today adds a progressive-overload target to each exercise; the rest is the plan.
    without_targets = [{k: v for k, v in e.items() if k != "target"} for e in today["exercises"]]
    assert today["mode"] == "normal" and without_targets == planned

    client.post(f"{API}/recovery/log", headers=headers, json={
        "sleep_hours": 2, "sleep_quality": 1, "stress_level": 5, "muscle_soreness": 5,
    })
    today = client.get(f"{API}/workouts/plan/today", headers=headers).json()["data"]
    assert today["recovery_score"] < programming.RECOVERY_REST_BELOW
    assert today["mode"] == "rest" and today["workout_type"] == "flexibility"
    assert all(e["pattern"] == "mobility" for e in today["exercises"])


def test_quick_session_replaces_today_and_can_be_undone(client, ai_providers, monday):
    headers, _ = _onboard(client, injuries=["knee"])
    _generate(client, headers)
    res = client.post(f"{API}/workouts/quick", headers=headers, json={"minutes": 15, "place": "home"})
    assert res.status_code == 200
    today = res.json()["data"]
    assert today["quick"] is True and today["minutes"] == 15
    assert today["exercises"][0]["exercise_id"] == "Arm_Circles"
    for entry in today["exercises"][1:]:
        exercise = catalog.get(entry["exercise_id"])
        assert "knee" not in exercise.coaching.loads
        assert catalog.has_equipment(exercise, ONBOARDING["available_equipment"])  # home kit only
        assert entry["sets"] == today["rounds"]

    assert today["rounds"] >= 2
    station = sum(
        planner.QUICK_WORK_SECONDS * (2 if e["per_side"] else 1) + planner.QUICK_REST_SECONDS
        for e in today["exercises"][1:]
    )
    assert planner.WARM_UP_SECONDS + station * today["rounds"] <= 15 * 60

    assert client.post(f"{API}/workouts/quick", headers=headers, json={"minutes": 12}).status_code == 422
    back = client.delete(f"{API}/workouts/quick", headers=headers).json()["data"]
    assert back["quick"] is False


# --- Swaps ---------------------------------------------------------------------------
def test_swapping_keeps_the_movement_pattern(client, ai_providers):
    headers, _ = _onboard(client, available_equipment=["full_gym"])
    plan = _generate(client, headers)
    day = next(d for d in plan["week"] if d["exercises"])
    original = day["exercises"][0]
    options = client.get(
        f"{API}/workouts/plan/{day['day']}/exercises/0/alternatives", headers=headers
    ).json()["data"]
    assert options and all(o["pattern"] == original["pattern"] for o in options)
    assert original["exercise_id"] not in {o["id"] for o in options}

    res = client.post(f"{API}/workouts/plan/{day['day']}/exercises/0/swap", headers=headers,
                      json={"exercise_id": options[0]["id"]})
    assert res.status_code == 200
    week = client.get(f"{API}/workouts/plan/week", headers=headers).json()["data"]["plan"]["week"]
    assert next(d for d in week if d["day"] == day["day"])["exercises"][0]["exercise_id"] == options[0]["id"]

    wrong = client.post(f"{API}/workouts/plan/{day['day']}/exercises/0/swap", headers=headers,
                        json={"exercise_id": "Plank"})
    assert wrong.status_code == 400
    missing = client.get(f"{API}/workouts/plan/Funday/exercises/0/alternatives", headers=headers)
    assert missing.status_code == 404


# --- Exercise library ----------------------------------------------------------------
def test_exercise_library_search_and_detail(client):
    headers, _ = register_and_login(client)
    data = client.get(f"{API}/exercises?q=squat", headers=headers).json()["data"]
    assert data["exercises"][0]["curated"] is True
    assert all("squat" in e["name"].lower() for e in data["exercises"])

    chest = client.get(f"{API}/exercises?muscle=chest&curated=true", headers=headers).json()["data"]["exercises"]
    assert chest and all("chest" in e["primary_muscles"] + e["secondary_muscles"] for e in chest)

    detail = client.get(f"{API}/exercises/Goblet_Squat", headers=headers).json()["data"]
    assert detail["coaching"]["grip"] and detail["coaching"]["stance"]
    assert detail["stabilizers"] and detail["force"] == "push" and detail["mechanic"] == "compound"
    assert detail["easier"]["id"] == "Bodyweight_Squat" and detail["harder"]["id"] == "Barbell_Squat"
    assert len(detail["images"]) == 2 and detail["source"] == "free-exercise-db"

    uncurated = client.get(f"{API}/exercises/Barbell_Full_Squat", headers=headers).json()["data"]
    assert uncurated["coaching"] is None and uncurated["instructions"]
    assert client.get(f"{API}/exercises/Not_An_Exercise", headers=headers).status_code == 404


def test_plans_saved_before_the_catalogue_still_load(client, ai_providers):
    """Older plans have no meta or catalogue fields; they must load, not break the page."""
    import asyncio

    from app.models.workout import WorkoutPlan

    headers, user_id = _onboard(client, email="oldplan@example.com")
    week = [{"day": day, "workout_type": "strength", "exercises": [
        {"name": "Squats", "sets": 3, "reps": "12", "rest": "60s", "difficulty": "medium", "video_url": None},
    ]} for day in planner.DAYS]
    asyncio.run(WorkoutPlan(user_id=user_id, week=week, fitness_goal="muscle_gain").save())

    plan = client.get(f"{API}/workouts/plan/week", headers=headers).json()["data"]["plan"]
    assert plan["meta"] is None and plan["week"][0]["exercises"][0]["name"] == "Squats"
    today = client.get(f"{API}/workouts/plan/today", headers=headers).json()["data"]
    assert today["exercises"][0]["name"] == "Squats"


# --- Audit: volume, balance and sensible choices ------------------------------------
def _week(**kw):
    base = {"goal": "recomposition", "experience": "beginner", "equipment": ["full_gym"], "injuries": [],
            "days_per_week": 4}
    return planner.build_week(**{**base, **kw})


def _sets(week, patterns):
    return sum(e["sets"] for d in week["week"] for e in d["exercises"] if e["pattern"] in patterns)


def test_a_beginner_gets_enough_weekly_volume_to_build_muscle():
    week = _week()
    sets = week["meta"]["weekly_sets"]
    for muscle in ("chest", "quadriceps", "hamstrings", "glutes"):
        assert sets.get(muscle, 0) >= 10, (muscle, sets)
    assert sets.get("lats", 0) + sets.get("middle back", 0) >= 10, sets
    for day in week["week"]:
        if day["workout_type"] == "strength":
            assert planner._minutes(day["exercises"]) <= week["meta"]["session_minutes"]


@pytest.mark.parametrize("days", [3, 4, 5, 6])
@pytest.mark.parametrize("equipment", [["full_gym"], ["dumbbells"], ["dumbbells", "bench"]])
def test_pushing_and_pulling_stay_balanced(days, equipment):
    week = _week(days_per_week=days, equipment=equipment)
    push = _sets(week, {"push_horizontal", "push_vertical"})
    pull = _sets(week, {"pull_horizontal", "pull_vertical", "rear_delt"})
    assert pull and push / pull <= 1.35, (push, pull)


def test_the_best_exercise_is_repeated_rather_than_a_weaker_one_for_variety():
    week = _week()
    vertical = [e["exercise_id"] for d in week["week"] for e in d["exercises"] if e["pattern"] == "pull_vertical"]
    assert vertical and set(vertical) == {"Wide-Grip_Lat_Pulldown"}


def test_a_floor_press_is_only_for_people_without_a_bench():
    def presses(equipment):
        return {e["exercise_id"] for d in _week(equipment=equipment)["week"] for e in d["exercises"]}
    assert "Dumbbell_Floor_Press" in presses(["dumbbells"])
    assert "Dumbbell_Floor_Press" not in presses(["dumbbells", "bench"])
    assert "Dumbbell_Floor_Press" not in presses(["full_gym"])


def test_a_beginner_with_a_pull_up_bar_starts_with_scapular_pull_ups():
    week = _week(equipment=["pull_up_bar"], days_per_week=3)
    ids = {e["exercise_id"] for d in week["week"] for e in d["exercises"]}
    assert "Scapular_Pull-Up" in ids
    assert catalog.get("Chin-Up").coaching.easier == "Band_Assisted_Pull-Up"
    assert catalog.get("Scapular_Pull-Up").coaching.harder == "Chin-Up"


@pytest.mark.parametrize("equipment", [["bodyweight"], ["resistance_bands"], ["pull_up_bar"]])
def test_no_pull_day_without_real_pulling_exercises(equipment):
    week = _week(equipment=equipment, days_per_week=6)
    assert "Pull (back, biceps)" not in {d["focus"] for d in week["week"]}
    assert all(len(d["exercises"]) >= 4 for d in week["week"] if d["workout_type"] == "strength")
