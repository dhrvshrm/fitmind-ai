from app.services.recovery_service import calculate_recovery_score

API = "/api/v1"


def _register(client, email, password="password123", name=None):
    body = {"email": email, "password": password, **({"name": name} if name else {})}
    assert client.post(f"{API}/auth/register", json=body).status_code == 201
    token = client.post(f"{API}/auth/login", json={"email": email, "password": password}).json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers, client.get(f"{API}/auth/me", headers=headers).json()["data"]


def test_signup_name_is_stored_and_used_for_the_username(client):
    _, me = _register(client, "priya.s1990@example.com", name="  Priya   Sharma ")
    assert me["name"] == "Priya Sharma"
    assert me["username"] == "priyasharma"


def test_usernames_from_the_same_name_stay_unique(client):
    _, first = _register(client, "a@example.com", name="Priya Sharma")
    _, second = _register(client, "b@example.com", name="Priya Sharma")
    assert first["username"] != second["username"]


def test_signup_without_a_name_still_works(client):
    _, me = _register(client, "rahul@example.com")
    assert me["name"] is None and me["username"] == "rahul"


def test_name_can_be_changed_in_settings(client):
    headers, _ = _register(client, "x@example.com", name="Priya")
    res = client.put(f"{API}/settings/profile", headers=headers, json={"name": "Priya S"})
    assert res.status_code == 200
    assert client.get(f"{API}/auth/me", headers=headers).json()["data"]["name"] == "Priya S"


def test_recovery_score_reflects_every_input():
    # A full, restful night with no stress or soreness is the maximum.
    assert calculate_recovery_score(8, 5, 1, 1) == 100
    # An ordinary night no longer reads as fully recovered.
    assert 55 <= calculate_recovery_score(6.5, 3, 3, 2) < 80
    # Stress and soreness lower the score even after enough sleep.
    assert calculate_recovery_score(8, 5, 5, 5) < calculate_recovery_score(8, 5, 1, 1) - 30
    # Very short, poor sleep under stress is a rest day.
    assert calculate_recovery_score(3, 1, 5, 5) < 40
    # More than 8 hours doesn't push past 100.
    assert calculate_recovery_score(12, 5, 1, 1) == 100
