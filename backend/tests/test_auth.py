from tests.conftest import register_and_login

API = "/api/v1"


def test_register_normalises_email_and_login_ignores_case(client):
    res = client.post(f"{API}/auth/register", json={"email": "Asha@Example.com", "password": "password123"})
    assert res.status_code == 201
    assert res.json()["data"]["email"] == "asha@example.com"

    login = client.post(f"{API}/auth/login", json={"email": "ASHA@example.com", "password": "password123"})
    assert login.status_code == 200
    assert login.json()["data"]["token"]


def test_duplicate_email_is_rejected_regardless_of_case(client):
    client.post(f"{API}/auth/register", json={"email": "dup@example.com", "password": "password123"})
    res = client.post(f"{API}/auth/register", json={"email": "DUP@example.com", "password": "password123"})
    assert res.status_code == 409


def test_short_password_is_rejected(client):
    res = client.post(f"{API}/auth/register", json={"email": "a@example.com", "password": "short"})
    assert res.status_code == 422
    assert res.json()["success"] is False


def test_usernames_are_unique_across_email_domains(client):
    headers_a, _ = register_and_login(client, "john@gmail.com")
    headers_b, _ = register_and_login(client, "john@yahoo.com")
    name_a = client.get(f"{API}/auth/me", headers=headers_a).json()["data"]["username"]
    name_b = client.get(f"{API}/auth/me", headers=headers_b).json()["data"]["username"]
    assert name_a == "john"
    assert name_b == "john2"


def test_changing_username_to_a_taken_one_fails(client):
    register_and_login(client, "taken@example.com")
    headers, _ = register_and_login(client, "other@example.com")
    res = client.put(f"{API}/settings/profile", headers=headers, json={"username": "taken"})
    assert res.status_code == 400
    assert "taken" in res.json()["message"]


def test_protected_routes_require_a_valid_token(client):
    assert client.get(f"{API}/auth/me").status_code in (401, 403)
    res = client.get(f"{API}/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert res.status_code == 401


def test_password_hash_is_never_returned(client):
    headers, _ = register_and_login(client)
    data = client.get(f"{API}/users/profile", headers=headers).json()["data"]
    assert "password_hash" not in data
