"""The action-taking coach: persistence, tools, propose/confirm, menu advice, fallbacks."""
import asyncio
import json

from app.coach import registry
from app.coach.registry import Tool
from app.services import chat_service
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"


def turn(reply="", *calls):
    """A scripted coach model response."""
    return json.dumps({"reply": reply, "tool_calls": [{"name": n, "args": a} for n, a in calls]})


def coach_prompts(fake):
    """Prompts the coach sent (other features may call the AI too, e.g. onboarding)."""
    return [c["prompt"] for c in fake.calls if "FitMind's coach" in (c["system"] or "")]


def setup_user(client, email="coach@example.com"):
    headers, user_id = register_and_login(client, email)
    client.post(f"{API}/users/onboarding", json=ONBOARDING, headers=headers)
    return headers, user_id


def say(client, headers, content):
    res = client.post(f"{API}/coach/messages", json={"content": content}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]


def water_today(client, headers):
    return client.get(f"{API}/nutrition/today", headers=headers).json()["data"]["water_ml"]


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------
def test_messages_are_stored_and_loaded_with_the_conversation(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("Protein first at lunch: 40 g.")]
    data = say(client, headers, "What should I focus on?")
    assert data["content"] == "Protein first at lunch: 40 g."

    convo = client.get(f"{API}/coach/conversation", headers=headers).json()["data"]
    assert convo["conversation_id"] == data["conversation_id"]
    assert [(m["role"], m["content"]) for m in convo["messages"]] == [
        ("user", "What should I focus on?"),
        ("assistant", "Protein first at lunch: 40 g."),
    ]


def test_history_is_sent_to_the_model_on_the_next_turn(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("Noted."), turn("Yes.")]
    say(client, headers, "I train at 7 pm")
    say(client, headers, "Is that fine?")
    assert "I train at 7 pm" in coach_prompts(ai_providers)[-1]


def test_new_chat_and_clear_history(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("One."), turn("Two.")]
    first = say(client, headers, "hello")
    fresh = client.post(f"{API}/coach/conversation", headers=headers).json()["data"]
    assert fresh["conversation_id"] != first["conversation_id"]
    assert client.get(f"{API}/coach/conversation", headers=headers).json()["data"]["messages"] == []

    say(client, headers, "again")
    assert client.delete(f"{API}/coach/history", headers=headers).status_code == 200
    convo = client.get(f"{API}/coach/conversation", headers=headers).json()["data"]
    assert convo == {"conversation_id": None, "messages": []}


def test_stored_history_is_capped_per_user(client, ai_providers, monkeypatch):
    monkeypatch.setattr(chat_service, "MAX_STORED_MESSAGES", 4)
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn(f"Reply {i}.") for i in range(3)]
    for i in range(3):
        say(client, headers, f"Message {i}")
    messages = client.get(f"{API}/coach/conversation", headers=headers).json()["data"]["messages"]
    assert [m["content"] for m in messages] == ["Message 1", "Reply 1.", "Message 2", "Reply 2."]


# ---------------------------------------------------------------------------
# Tool dispatch
# ---------------------------------------------------------------------------
def test_read_tools_run_and_their_results_go_back_to_the_model(client, ai_providers):
    headers, _ = setup_user(client)
    client.post(f"{API}/nutrition/water", json={"amount_ml": 750}, headers=headers)
    ai_providers.gemini = [
        turn("", ("get_nutrition_today", {})),
        turn("You've had 750 ml of water so far."),
    ]
    data = say(client, headers, "How much water today?")
    assert data["content"] == "You've had 750 ml of water so far."
    assert data["proposals"] == []
    second_prompt = coach_prompts(ai_providers)[1]
    assert '"tool":"get_nutrition_today"' in second_prompt
    assert '"water_ml":750' in second_prompt


def test_invalid_action_arguments_go_back_as_an_error_and_nothing_is_proposed(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("", ("log_water", {})), turn("How much water did you drink?")]
    data = say(client, headers, "log some water")
    assert data["content"] == "How much water did you drink?"
    assert data["proposals"] == []
    assert "missing or invalid" in coach_prompts(ai_providers)[1]


def test_unknown_tools_are_ignored(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("", ("delete_everything", {})), turn("I can't do that.")]
    data = say(client, headers, "delete my account")
    assert data["content"] == "I can't do that."
    assert data["proposals"] == []


# ---------------------------------------------------------------------------
# Propose and confirm
# ---------------------------------------------------------------------------
def test_action_tools_only_run_after_confirm(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("Ready to log 500 ml.", ("log_water", {"amount_ml": 500}))]
    data = say(client, headers, "I drank 500 ml of water")
    [proposal] = data["proposals"]
    assert proposal["status"] == "pending"
    assert proposal["tool"] == "log_water"
    assert {"label": "Water", "value": "+500 ml"} in proposal["changes"]
    assert "nutrition" in proposal["invalidates"]
    assert water_today(client, headers) == 0  # Nothing changed yet.

    res = client.post(f"{API}/coach/actions/{proposal['id']}/confirm", headers=headers)
    assert res.status_code == 200
    body = res.json()["data"]
    assert body["proposal"]["status"] == "done"
    assert body["message"]["content"] == "Logged 500 ml of water. 500 ml today."
    assert "nutrition" in body["invalidate"]
    assert water_today(client, headers) == 500

    # A double tap can't run it twice.
    again = client.post(f"{API}/coach/actions/{proposal['id']}/confirm", headers=headers)
    assert again.status_code == 409
    assert water_today(client, headers) == 500

    # The confirmation is stored in the chat and the card shows its result.
    messages = client.get(f"{API}/coach/conversation", headers=headers).json()["data"]["messages"]
    assert messages[-1]["kind"] == "action_result"
    assert messages[1]["proposals"][0]["status"] == "done"


def test_cancelled_actions_never_run(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("", ("log_water", {"amount_ml": 250}))]
    proposal = say(client, headers, "a glass of water")["proposals"][0]
    assert client.post(f"{API}/coach/actions/{proposal['id']}/cancel", headers=headers).status_code == 200
    assert client.post(f"{API}/coach/actions/{proposal['id']}/confirm", headers=headers).status_code == 409
    assert water_today(client, headers) == 0


def test_other_users_cannot_confirm_my_actions(client, ai_providers):
    headers, _ = setup_user(client)
    other, _ = setup_user(client, "other@example.com")
    ai_providers.gemini = [turn("", ("log_water", {"amount_ml": 250}))]
    proposal = say(client, headers, "a glass of water")["proposals"][0]
    assert client.post(f"{API}/coach/actions/{proposal['id']}/confirm", headers=other).status_code == 404
    assert water_today(client, headers) == 0


def test_expired_proposals_must_be_asked_for_again(client, ai_providers, monkeypatch):
    from datetime import timedelta

    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("", ("log_water", {"amount_ml": 250}))]
    proposal = say(client, headers, "a glass of water")["proposals"][0]
    monkeypatch.setattr(chat_service, "PROPOSAL_TTL", timedelta(seconds=-1))
    res = client.post(f"{API}/coach/actions/{proposal['id']}/confirm", headers=headers)
    assert res.status_code == 409
    assert water_today(client, headers) == 0


def test_meal_confirmation_uses_backend_numbers_not_the_models(client, ai_providers):
    headers, _ = setup_user(client)
    # The model claims it already logged a made-up number; neither is trusted.
    ai_providers.gemini = [
        turn("I've logged it: 999 kcal.", ("log_meal", {"description": "2 roti", "meal_type": "lunch"}))
    ]
    data = say(client, headers, "had 2 rotis for lunch")
    assert data["content"] == chat_service.CONFIRM_PROMPT
    [proposal] = data["proposals"]
    shown_kcal = next(c["value"] for c in proposal["changes"] if c["label"] == "Calories")
    assert "999" not in shown_kcal
    assert client.get(f"{API}/nutrition/today", headers=headers).json()["data"]["meals_logged"] == 0

    body = client.post(f"{API}/coach/actions/{proposal['id']}/confirm", headers=headers).json()["data"]
    meal = body["data"]["meal"]
    assert f"{round(meal['calories'])} kcal" == shown_kcal
    assert body["message"]["content"].startswith(f"Logged {meal['name']}: {round(meal['calories'])} kcal")
    assert "999" not in body["message"]["content"]
    today = client.get(f"{API}/nutrition/today", headers=headers).json()["data"]
    assert today["meals_logged"] == 1
    assert today["meals"][0]["meal_type"] == "lunch"


def test_service_failures_are_reported_as_failed_actions(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("", ("start_quick_workout", {"minutes": 15, "place": "home"}))]
    proposal = say(client, headers, "15 minutes at home")["proposals"][0]

    async def boom(ctx, payload):
        raise registry.ToolError("Workout service is down.")

    tool = registry.get("start_quick_workout")
    original = tool.execute
    tool.execute = boom
    try:
        body = client.post(f"{API}/coach/actions/{proposal['id']}/confirm", headers=headers).json()["data"]
    finally:
        tool.execute = original
    assert body["proposal"]["status"] == "failed"
    assert body["message"]["content"] == "Workout service is down."
    assert body["invalidate"] == []


def test_plan_tools_explain_when_there_is_no_plan(client, ai_providers):
    headers, _ = register_and_login(client, "noplan@example.com")
    ai_providers.gemini = [turn("", ("regenerate_plan_meal", {"meal": "lunch"})), turn("")]
    data = say(client, headers, "give me a different lunch")
    assert data["proposals"] == []
    assert data["content"] == "You don't have a meal plan yet."


def test_regenerating_a_plan_meal_is_proposed_then_applied(client, ai_providers):
    headers, _ = setup_user(client)
    if client.get(f"{API}/diet-plans/current", headers=headers).json()["data"] is None:
        client.post(f"{API}/diet-plans", headers=headers)
    plan = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    slot = plan["meals"][0]["id"]
    ai_providers.gemini = [turn("", ("regenerate_plan_meal", {"meal": slot}))]
    proposal = say(client, headers, f"different {slot} please")["proposals"][0]
    assert proposal["invalidates"] == ["dietPlan"]
    unchanged = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    assert unchanged["version"] == plan["version"]

    body = client.post(f"{API}/coach/actions/{proposal['id']}/confirm", headers=headers).json()["data"]
    assert body["proposal"]["status"] == "done"
    after = client.get(f"{API}/diet-plans/current", headers=headers).json()["data"]
    assert after["version"] == plan["version"] + 1
    new_meal = next(m for m in after["meals"] if m["id"] == slot)
    assert f"{round(new_meal['totals']['kcal'])} kcal" in body["message"]["content"]


# ---------------------------------------------------------------------------
# "What should I order?"
# ---------------------------------------------------------------------------
MENU = "Butter Chicken  Rs 380\nDal Makhani 250\nTandoori Chicken (half) 340\nVeg Biryani - 220"


def test_menu_suggestions_use_backend_estimates_and_offer_log_cards(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [json.dumps({"options": [
        {"name": "Tandoori Chicken", "portion": "250 g", "why": "High protein, grilled."},
        {"name": "Dal Makhani", "portion": "1 bowl", "why": "Protein and fibre."},
    ]})]
    res = client.post(f"{API}/coach/menu", data={"text": MENU}, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    names = [o["name"] for o in data["options"]]
    assert names == ["Tandoori Chicken", "Dal Makhani"]
    assert all(o["estimate"] and o["kcal"] > 0 for o in data["options"])
    message = data["message"]
    assert "estimates" in message["content"]
    assert len(message["proposals"]) == 2
    assert message["proposals"][0]["tool"] == "log_meal"

    # Logging a pick records exactly the estimate shown.
    pick = data["options"][0]
    body = client.post(f"{API}/coach/actions/{message['proposals'][0]['id']}/confirm", headers=headers).json()["data"]
    assert round(body["data"]["meal"]["calories"]) == pick["kcal"]

    # The exchange is part of the chat history.
    stored = client.get(f"{API}/coach/conversation", headers=headers).json()["data"]["messages"]
    assert stored[0]["kind"] == "menu" and stored[1]["kind"] == "menu"


def test_menu_suggestions_fall_back_to_ranking_without_ai(client, ai_providers):
    headers, _ = setup_user(client)
    res = client.post(f"{API}/coach/menu", data={"text": MENU}, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert 1 <= len(data["options"]) <= 3
    assert "isn't available" in data["message"]["content"]
    # Ranked by protein per calorie among what fits: tandoori chicken leads.
    assert data["options"][0]["name"].lower().startswith("tandoori chicken")


def test_menu_through_chat_uses_the_menu_tool(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [
        turn("", ("suggest_from_menu", {"menu_text": MENU})),
        json.dumps({"options": [{"name": "Tandoori Chicken", "portion": "250 g", "why": "Lean protein."}]}),
    ]
    data = say(client, headers, MENU)
    assert "Tandoori Chicken" in data["content"]
    assert "estimates" in data["content"]
    assert [p["tool"] for p in data["proposals"]] == ["log_meal"]


def test_menu_photo_is_read_with_vision(client, ai_providers, monkeypatch):
    from app.ai import client as ai_client

    async def fake_vision(prompt, system, image, mime_type):
        return json.dumps({"items": ["Tandoori Chicken", "Dal Makhani"]})

    monkeypatch.setitem(ai_client._VISION_PROVIDERS, ai_client.PROVIDER_GEMINI, fake_vision)
    headers, _ = setup_user(client)
    res = client.post(
        f"{API}/coach/menu",
        files={"image": ("menu.jpg", b"\xff\xd8fakejpeg", "image/jpeg")},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["data"]["options"]


def test_menu_needs_text_or_a_photo(client, ai_providers):
    headers, _ = setup_user(client)
    assert client.post(f"{API}/coach/menu", data={"text": ""}, headers=headers).status_code == 400


# ---------------------------------------------------------------------------
# Fallbacks, socket and registry
# ---------------------------------------------------------------------------
def test_honest_reply_when_ai_is_unavailable(client, ai_providers):
    headers, _ = setup_user(client)
    data = say(client, headers, "What should I eat?")
    assert data["content"] == chat_service.UNAVAILABLE_REPLY
    assert data["proposals"] == []


def test_quota_reply_when_the_daily_limit_is_used(client, ai_providers, monkeypatch):
    from app.ai import client as ai_client

    async def no_quota(user_id):
        raise ai_client.AIQuotaError("limit")

    monkeypatch.setattr(ai_client, "_charge", no_quota)
    headers, _ = setup_user(client)
    assert say(client, headers, "hi")["content"] == chat_service.QUOTA_REPLY


def _token(headers):
    return headers["Authorization"].split(" ", 1)[1]


def test_websocket_streams_the_reply_and_sends_proposals(client, ai_providers):
    headers, _ = setup_user(client)
    ai_providers.gemini = [turn("Ready to log 300 ml of water for you.", ("log_water", {"amount_ml": 300}))]
    with client.websocket_connect("/ws") as ws:
        ws.send_json({"type": "auth", "token": _token(headers)})
        assert ws.receive_json() == {"type": "ready"}
        ws.send_json({"type": "message", "content": "300 ml water"})
        frames = []
        while True:
            frame = ws.receive_json()
            if frame["type"] == "notification":
                continue
            frames.append(frame)
            if frame["type"] in ("done", "error"):
                break
    assert frames[0]["type"] == "start"
    tokens = "".join(f["content"] for f in frames if f["type"] == "token")
    assert tokens == "Ready to log 300 ml of water for you."
    done = frames[-1]
    assert done["type"] == "done" and done["content"] == tokens
    assert done["proposals"][0]["tool"] == "log_water"


def test_registering_a_tool_and_a_context_block_is_one_line(client, ai_providers):
    headers, user_id = setup_user(client)

    async def supplements(ctx, args):
        return {"supplements": ["creatine 3 g"]}

    def health_context(uid):
        return "Health: no conditions reported."

    registry.register(Tool("get_supplements", "The user's supplements.", "read", run=supplements))
    registry.register_context(health_context)
    try:
        assert "get_supplements [read]" in chat_service.system_prompt()
        assert "Health: no conditions reported." in asyncio.run(registry.build_context(user_id))
        ai_providers.gemini = [turn("", ("get_supplements", {})), turn("Creatine, 3 g a day.")]
        assert say(client, headers, "what do I take?")["content"] == "Creatine, 3 g a day."
        assert "creatine 3 g" in coach_prompts(ai_providers)[1]
    finally:
        registry.TOOLS.pop("get_supplements", None)
        registry.CONTEXT_BLOCKS.remove(health_context)


def test_account_deletion_removes_coach_history(client, ai_providers, mock_db):
    headers, user_id = setup_user(client)
    ai_providers.gemini = [turn("", ("log_water", {"amount_ml": 250}))]
    say(client, headers, "a glass of water")
    assert asyncio.run(mock_db["coach_messages"].count_documents({"user_id": user_id})) == 2

    from app.services import privacy_service

    asyncio.run(privacy_service.delete_user_data(user_id))
    for name in ("coach_conversations", "coach_messages", "coach_proposals"):
        assert asyncio.run(mock_db[name].count_documents({"user_id": user_id})) == 0


def test_coach_replies_follow_the_style_guide():
    from app.ai.style import find_style_violations

    for text in (chat_service.UNAVAILABLE_REPLY, chat_service.QUOTA_REPLY,
                 chat_service.CONFIRM_PROMPT, chat_service.NO_ANSWER_REPLY):
        assert find_style_violations(text) == []
    assert "No generic encouragement" in chat_service.system_prompt()


def test_tool_catalog_covers_the_required_tools():
    names = set(registry.TOOLS)
    assert {"get_nutrition_today", "get_meal_plan", "get_today_workout", "get_recovery",
            "get_weight_trend", "log_meal", "log_water", "regenerate_plan_meal", "swap_plan_food",
            "start_quick_workout", "log_recovery", "suggest_from_menu"} <= names
