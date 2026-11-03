import asyncio

from app.services import privacy_service
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"


async def _count_user_docs(db, user_id):
    """Count documents referencing ``user_id`` in every user-data collection."""
    counts = {}
    for collection, fields in privacy_service.USER_DATA_COLLECTIONS.items():
        query = {"$or": [{field: user_id} for field in fields]}
        counts[collection] = await db[collection].count_documents(query)
    return counts


def _create_activity(client, headers):
    client.post(f"{API}/users/onboarding", headers=headers, json=ONBOARDING)
    client.post(f"{API}/nutrition/meal", headers=headers, json={"name": "Dal", "calories": 200})
    client.post(f"{API}/nutrition/water", headers=headers, json={"amount_ml": 500})
    client.post(f"{API}/workouts/log", headers=headers, json={"duration_minutes": 20})
    client.put(f"{API}/workouts/exercise/complete", headers=headers, json={"exercise_name": "Squat"})
    client.post(
        f"{API}/recovery/log",
        headers=headers,
        json={"sleep_hours": 7, "sleep_quality": 4, "stress_level": 2, "muscle_soreness": 2},
    )


def test_deleting_an_account_removes_all_of_the_users_data(client, mock_db):
    headers, user_id = register_and_login(client, "leaver@example.com")
    friend_headers, friend_id = register_and_login(client, "friend@example.com")
    _create_activity(client, headers)
    _create_activity(client, friend_headers)
    client.post(f"{API}/friends/request", headers=headers, json={"to_user_id": friend_id})

    before = asyncio.run(_count_user_docs(mock_db, user_id))
    for collection in ("users", "meals", "water_intake", "workout_logs", "workout_progress",
                       "recovery_logs", "weight_logs", "friendships", "xp_events", "audit_logs"):
        assert before[collection] > 0, collection

    res = client.delete(f"{API}/settings/account", headers=headers)
    assert res.status_code == 200

    after = asyncio.run(_count_user_docs(mock_db, user_id))
    assert all(count == 0 for count in after.values()), after

    # The other user's data is untouched (except the shared friendship).
    friend_after = asyncio.run(_count_user_docs(mock_db, friend_id))
    assert friend_after["users"] == 1
    assert friend_after["meals"] == 1
    assert friend_after["friendships"] == 0


def test_deleted_users_token_stops_working(client):
    headers, _ = register_and_login(client)
    client.delete(f"{API}/settings/account", headers=headers)
    assert client.get(f"{API}/auth/me", headers=headers).status_code == 401


def test_every_collection_with_a_user_id_index_is_covered_by_deletion():
    """New collections holding user data must be added to USER_DATA_COLLECTIONS."""
    from app.config.database import _INDEXES

    shared = {"ai_cache"}  # Not personal: keyed by normalised, non-personal input.
    user_collections = {
        name for name, specs in _INDEXES.items()
        if any(keys[0][0] in ("user_id", "requester_id", "id") for keys, _ in specs)
    }
    assert user_collections - shared <= set(privacy_service.USER_DATA_COLLECTIONS)
