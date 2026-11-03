import pytest
from starlette.websockets import WebSocketDisconnect

from app.api.v1.websockets import CLOSE_UNAUTHORIZED
from app.config.settings import DEV_JWT_SECRET, Settings
from app.services import notification_service
from tests.conftest import register_and_login

API = "/api/v1"


def _token(headers):
    return headers["Authorization"].split(" ", 1)[1]


def test_clients_cannot_award_themselves_xp(client):
    headers, _ = register_and_login(client)
    res = client.post(f"{API}/gamification/xp", headers=headers, json={"amount": 1000})
    assert res.status_code in (404, 405)
    assert client.get(f"{API}/gamification/profile", headers=headers).json()["data"]["xp"] == 0


def test_websocket_rejects_connections_without_a_valid_token(client):
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": "forged"})
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
    assert exc.value.code == CLOSE_UNAUTHORIZED


def test_websocket_rejects_a_first_frame_that_is_not_auth(client):
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "message", "content": "hi"})
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
    assert exc.value.code == CLOSE_UNAUTHORIZED


def test_old_user_id_socket_route_is_gone(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/some-user-id") as ws:
            ws.receive_json()


def test_websocket_accepts_a_valid_token_and_delivers_only_that_users_notifications(client):
    headers, user_id = register_and_login(client, "me@example.com")
    _, other_id = register_and_login(client, "other@example.com")

    import asyncio

    asyncio.run(notification_service.create_notification(other_id, "nudge", "for other"))
    asyncio.run(notification_service.create_notification(user_id, "nudge", "for me"))

    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": _token(headers)})
        assert ws.receive_json() == {"type": "ready"}
        pending = ws.receive_json()
        assert pending["type"] == "notification"
        assert pending["data"]["message"] == "for me"
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}


def test_production_refuses_default_jwt_secret_and_missing_origins():
    settings = Settings(DATABASE_ENV="production", JWT_SECRET=DEV_JWT_SECRET, CORS_EXTRA_ORIGINS="")
    with pytest.raises(RuntimeError) as exc:
        settings.validate_for_production()
    assert "JWT_SECRET" in str(exc.value)
    assert "CORS_EXTRA_ORIGINS" in str(exc.value)


def test_production_accepts_safe_settings():
    settings = Settings(
        DATABASE_ENV="production",
        JWT_SECRET="x" * 48,
        CORS_EXTRA_ORIGINS="https://fitmind.example",
        DEBUG=False,
    )
    settings.validate_for_production()


def test_memory_fallback_is_disabled_in_production():
    assert Settings(DATABASE_ENV="production").allows_memory_fallback is False
    assert Settings(DATABASE_ENV="local").allows_memory_fallback is True
