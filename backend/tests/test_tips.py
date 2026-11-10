import json

from app.services import tip_service
from tests.conftest import register_and_login

API = "/api/v1"


def test_tip_falls_back_to_a_written_tip_without_ai(client, ai_providers):
    headers, _ = register_and_login(client)
    tip = client.get(f"{API}/tips/today", headers=headers).json()["data"]
    assert tip["source"] == "curated"
    assert tip["text"] in [t["text"] for t in tip_service.FALLBACK_TIPS]


def test_ai_tip_is_made_once_a_day_for_everyone(client, ai_providers):
    ai_providers.gemini.append(json.dumps({"kind": "fact", "text": "Muscles store water along with glycogen, so a salty meal can nudge the scale up overnight."}))
    first, _ = register_and_login(client, "a@example.com")
    second, _ = register_and_login(client, "b@example.com")
    tip_a = client.get(f"{API}/tips/today", headers=first).json()["data"]
    tip_b = client.get(f"{API}/tips/today", headers=second).json()["data"]
    assert tip_a["source"] == "ai" and tip_a["text"] == tip_b["text"]
    assert len(ai_providers.calls) == 1  # cached for the day


def test_tip_breaking_the_style_rules_is_replaced(client, ai_providers):
    ai_providers.gemini.append(json.dumps({"kind": "tip", "text": "Amazing news! You've got this, crush your goals with an extra glass of water today."}))
    headers, _ = register_and_login(client)
    tip = client.get(f"{API}/tips/today", headers=headers).json()["data"]
    assert tip["source"] == "curated"
