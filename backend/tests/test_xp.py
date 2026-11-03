import asyncio

from app.models.gamification import XP_REWARDS
from app.models.user import User
from app.services import gamification_service
from tests.conftest import register_and_login

API = "/api/v1"
MEAL = {"name": "Poha", "calories": 250, "protein": 6, "carbs": 45, "fats": 6}


def _xp(client, headers):
    return client.get(f"{API}/gamification/profile", headers=headers).json()["data"]["xp"]


def test_workout_xp_is_awarded_once_per_day(client):
    headers, _ = register_and_login(client)
    first = client.post(f"{API}/workouts/log", headers=headers, json={"duration_minutes": 30})
    second = client.post(f"{API}/workouts/log", headers=headers, json={"duration_minutes": 30})

    assert first.json()["data"]["xp_earned"] == XP_REWARDS["workout"]
    assert second.json()["data"]["xp_earned"] == 0
    assert _xp(client, headers) == XP_REWARDS["workout"]
    # The second workout is still logged, it just doesn't pay out.
    history = client.get(f"{API}/workouts/history", headers=headers).json()["data"]["workouts"]
    assert len(history) == 2


def test_meal_xp_is_capped_per_day(client):
    headers, _ = register_and_login(client)
    earned = [
        client.post(f"{API}/nutrition/meal", headers=headers, json=MEAL).json()["data"]["xp_earned"]
        for _ in range(7)
    ]
    cap = gamification_service.DAILY_XP_CAPS["meal"]
    assert earned == [XP_REWARDS["meal"]] * cap + [0] * (7 - cap)
    assert _xp(client, headers) == XP_REWARDS["meal"] * cap


def test_recovery_relog_does_not_award_xp_again(client):
    headers, _ = register_and_login(client)
    payload = {"sleep_hours": 7, "sleep_quality": 4, "stress_level": 2, "muscle_soreness": 2}
    first = client.post(f"{API}/recovery/log", headers=headers, json=payload)
    second = client.post(f"{API}/recovery/log", headers=headers, json=payload)
    assert first.json()["data"]["xp_earned"] == XP_REWARDS["recovery"]
    assert second.json()["data"]["xp_earned"] == 0


def test_profile_update_does_not_overwrite_concurrent_xp(client):
    headers, user_id = register_and_login(client)

    async def race():
        stale = await User.get_by_id(user_id)  # Loaded before XP changes.
        await gamification_service.award_xp(user_id, 120)
        await stale.update({"weight_kg": 72})  # Must not write back xp=0.

    asyncio.run(race())
    assert _xp(client, headers) == 120


def test_level_follows_xp(client):
    headers, user_id = register_and_login(client)
    result = asyncio.run(gamification_service.award_xp(user_id, 250))
    assert result["leveled_up"] is True
    profile = client.get(f"{API}/gamification/profile", headers=headers).json()["data"]
    assert profile["level"] == 2
