import json

from app.ai.style import STYLE_GUIDE
from app.services.workout_service import DAYS
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"


def _week(days=DAYS, exercises_per_day=4):
    return {
        "week": [
            {
                "day": day.upper() if i == 0 else day,  # Casing is normalised.
                "workout_type": "rest" if day == "Sunday" else "strength",
                "exercises": []
                if day == "Sunday"
                else [
                    {"name": f"Move {n}", "sets": 3, "reps": 10, "rest": 60, "difficulty": "medium"}
                    for n in range(exercises_per_day)
                ],
            }
            for i, day in enumerate(days)
        ]
    }


def test_valid_ai_plan_is_saved_in_weekday_order(client, ai_providers):
    headers, _ = register_and_login(client)
    shuffled = list(reversed(DAYS))
    ai_providers.gemini = [json.dumps(_week(shuffled))]
    res = client.post(f"{API}/workouts/generate", headers=headers, json={})
    week = res.json()["data"]["weekly_plan"]["week"]
    assert [d["day"] for d in week] == DAYS
    monday = week[0]["exercises"][0]
    assert monday["reps"] == "10" and monday["rest"] == "60"


def test_plan_missing_a_day_is_retried_then_falls_back_to_template(client, ai_providers):
    headers, _ = register_and_login(client)
    incomplete = json.dumps(_week(DAYS[:6]))
    ai_providers.gemini = [incomplete, incomplete]
    res = client.post(f"{API}/workouts/generate", headers=headers, json={})
    week = res.json()["data"]["weekly_plan"]["week"]
    assert len(week) == 7
    assert week[0]["exercises"][0]["name"] == "Squats"  # Template plan.
    assert len(ai_providers.calls) == 2


def test_injuries_and_equipment_reach_the_prompt(client, ai_providers):
    headers, _ = register_and_login(client)
    client.post(
        f"{API}/users/onboarding",
        headers=headers,
        json={**ONBOARDING, "injuries": ["Left knee"], "available_equipment": ["resistance_bands"]},
    )
    ai_providers.gemini = [json.dumps(_week())]
    client.post(f"{API}/workouts/generate", headers=headers, json={})
    prompt = ai_providers.calls[0]["prompt"]
    assert "Left knee" in prompt
    assert "resistance_bands" in prompt
    assert STYLE_GUIDE in ai_providers.calls[0]["system"]


def test_plan_generation_works_with_no_ai_configured(client, ai_providers):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/workouts/generate", headers=headers, json={})
    assert res.status_code == 200
    assert len(res.json()["data"]["weekly_plan"]["week"]) == 7
