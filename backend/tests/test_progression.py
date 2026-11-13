import asyncio
from datetime import date, timedelta

from app.models import exercise_log as store
from app.models.recovery import RecoveryLog
from app.services import workout_service
from app.utils.time import local_today
from app.workouts import progression
from app.workouts.progression import Session
from tests.conftest import ONBOARDING, register_and_login

API = "/api/v1"
TODAY = date(2026, 11, 12)


def _s(day: str, *sets, felt=None) -> Session:
    return Session(date=day, sets=tuple(sets), felt=felt)


# --- Rules -------------------------------------------------------------------------
def test_first_time_has_no_weight_suggestion():
    target = progression.next_target([], (8, 12), 3, loaded=True, pattern="squat")
    assert target["action"] == "first_time" and target["weight_kg"] is None


def test_reps_climb_before_weight():
    history = [_s("2026-11-10", (20, 10), (20, 9), (20, 8))]
    target = progression.next_target(history, (8, 12), 3, loaded=True, pattern="push_horizontal")
    assert target["action"] == "add_reps"
    assert target["weight_kg"] == 20
    assert target["last"]["sets"][0] == {"weight_kg": 20, "reps": 10}


def test_two_sessions_at_the_top_add_weight():
    history = [_s("2026-11-10", (20, 12), (20, 12), (20, 12)), _s("2026-11-07", (20, 12), (20, 12), (20, 12))]
    upper = progression.next_target(history, (8, 12), 3, loaded=True, pattern="push_horizontal")
    legs = progression.next_target(history, (8, 12), 3, loaded=True, pattern="squat")
    curls = progression.next_target(history, (10, 15), 3, loaded=True, pattern="biceps")
    # Capped at 10 percent of 20 kg.
    assert upper["action"] == "add_weight" and upper["weight_kg"] == 22
    assert legs["weight_kg"] == 22
    heavy = [_s("2026-11-10", (100, 12), (100, 12), (100, 12), felt="easy")]
    assert progression.next_target(heavy, (8, 12), 3, loaded=True, pattern="squat")["weight_kg"] == 105
    assert progression.next_target(heavy, (8, 12), 3, loaded=True, pattern="push_horizontal")["weight_kg"] == 102.5
    # 12 reps isn't the top of 10-15, so curls keep building reps.
    assert curls["action"] == "add_reps"


def test_one_easy_session_at_the_top_is_enough():
    history = [_s("2026-11-10", (20, 12), (20, 12), (20, 12), felt="easy")]
    target = progression.next_target(history, (8, 12), 3, loaded=True, pattern="pull_horizontal")
    assert target["action"] == "add_weight"


def test_one_top_session_is_not_enough_without_easy():
    history = [_s("2026-11-10", (20, 12), (20, 12), (20, 12)), _s("2026-11-07", (20, 11), (20, 10), (20, 9))]
    assert progression.next_target(history, (8, 12), 3, loaded=True)["action"] == "add_reps"


def test_repeated_misses_reduce_the_weight():
    history = [_s("2026-11-10", (40, 6), (40, 5), (40, 5)), _s("2026-11-07", (40, 7), (40, 6), (40, 6))]
    target = progression.next_target(history, (8, 12), 3, loaded=True, pattern="squat")
    assert target["action"] == "reduce"
    assert target["weight_kg"] == 36


def test_a_hard_session_holds_the_weight():
    history = [_s("2026-11-10", (40, 9), (40, 8), (40, 8), felt="hard")]
    target = progression.next_target(history, (8, 12), 3, loaded=True, pattern="squat")
    assert target["action"] == "hold" and target["weight_kg"] == 40


def test_bodyweight_moves_to_the_harder_variation():
    history = [_s("2026-11-10", (0, 20), (0, 20)), _s("2026-11-07", (0, 20), (0, 20))]
    target = progression.next_target(history, (12, 20), 2, loaded=False, harder_id="Goblet_Squat")
    assert target["action"] == "harder_variation" and target["harder_id"] == "Goblet_Squat"
    no_harder = progression.next_target(history, (12, 20), 2, loaded=False)
    assert no_harder["action"] == "add_set"


def test_records_for_weight_estimated_max_and_reps():
    past = [_s("2026-11-07", (40, 8), (40, 8))]
    assert progression.new_records(_s("2026-11-10", (42.5, 8)), past)[0]["kind"] == "weight"
    assert progression.new_records(_s("2026-11-10", (40, 11)), past)[0]["kind"] == "estimated_max"
    assert progression.new_records(_s("2026-11-10", (40, 7)), past) == []
    bodyweight = progression.new_records(_s("2026-11-10", (0, 21)), [_s("2026-11-07", (0, 18))])
    assert bodyweight == [{"kind": "reps", "value": 21, "previous": 18}]
    assert progression.new_records(_s("2026-11-10", (40, 8)), []) == []


def test_estimated_max_and_rep_ranges():
    assert progression.estimated_max(100, 1) == 100
    assert progression.estimated_max(60, 10) == 80.0
    assert progression.estimated_max(0, 20) == 0
    assert progression.parse_rep_range("8-12 each side") == (8, 12)
    assert progression.parse_rep_range("10") == (10, 10)
    assert progression.parse_rep_range("30s") is None


def test_stall_needs_enough_recent_sessions_without_a_better_max():
    old = [_s("2026-10-10", (60, 10))]
    flat = [_s(f"2026-11-{d:02d}", (60, 9)) for d in (1, 4, 7, 10)]
    better = [_s("2026-11-10", (62.5, 10))] + flat[1:]
    assert progression.is_stalled(flat + old, TODAY)
    assert not progression.is_stalled(better + old, TODAY)
    assert not progression.is_stalled(flat[:2] + old, TODAY)


def test_deload_trims_sets_but_not_mobility():
    assert progression.deload_entry({"sets": 4, "pattern": "squat"})["sets"] == 2
    assert progression.deload_entry({"sets": 1, "pattern": "squat"})["sets"] == 1
    assert progression.deload_entry({"sets": 2, "pattern": "mobility"}) == {"sets": 2, "pattern": "mobility"}


def test_level_check_needs_consistency_and_strength():
    dates = [(TODAY - timedelta(days=d)).isoformat() for d in range(0, 56, 2)]  # 28 workouts
    strong = {"squat": 80.0, "hinge": 95.0}
    ready = progression.level_check("beginner", dates, strong, 70, None, TODAY)
    assert ready["ready"] and ready["next_level"] == "intermediate"
    assert not progression.level_check("beginner", dates[:10], strong, 70, None, TODAY)["ready"]
    assert not progression.level_check("beginner", dates, {"squat": 50.0}, 70, None, TODAY)["ready"]
    # Bodyweight-only lifters: most exercises at the top of their range.
    assert progression.level_check("beginner", dates, {}, 70, 0.75, TODAY)["ready"]
    assert progression.level_check("advanced", dates, strong, 70, None, TODAY)["next_level"] is None


def test_consistency_is_measured_against_the_users_own_plan():
    # 8 weeks at 75%: 3 days a week needs 18 sessions, 6 days a week needs 36.
    assert progression.workouts_needed("intermediate", 3) == 18
    assert progression.workouts_needed("intermediate", 6) == 36
    # A very light plan still needs a real amount of training.
    assert progression.workouts_needed("intermediate", 1) == 16
    assert progression.workouts_needed("advanced", 4) == 78
    twenty = [(TODAY - timedelta(days=d)).isoformat() for d in range(0, 56, 2)][:20]
    strong = {"squat": 80.0, "hinge": 95.0}
    three_days = progression.level_check("beginner", twenty, strong, 70, None, TODAY, days_per_week=3)
    six_days = progression.level_check("beginner", twenty, strong, 70, None, TODAY, days_per_week=6)
    assert three_days["ready"] and three_days["workouts_needed"] == 18
    # The same 20 sessions are only about half of a 6-day plan.
    assert not six_days["ready"] and six_days["workouts_needed"] == 36


def test_stall_reasons_need_enough_data():
    low_protein = [70.0] * 6
    reasons = progression.stall_reasons(low_protein, 130, [6.0, 6.5, 5.5], [50, 55, 45])
    assert reasons == [
        {"kind": "protein", "percent": 54, "days": 6},
        {"kind": "sleep", "hours": 6.0},
        {"kind": "recovery", "score": 50},
    ]
    # Too few logged days or check-ins: say nothing rather than guess.
    assert progression.stall_reasons([70.0] * 3, 130, [6.0, 6.0], [40]) == []
    # Enough protein and sleep: no reasons.
    assert progression.stall_reasons([125.0] * 7, 130, [7.5, 8, 7], [70, 80, 75]) == []


# --- API ---------------------------------------------------------------------------
GOBLET = {"exercise_id": "Goblet_Squat", "name": "Goblet Squat", "sets": 3, "reps": "8-12", "rest": "90s",
          "pattern": "squat"}


def _onboard(client, email="overload@example.com"):
    headers, user_id = register_and_login(client, email)
    client.post(f"{API}/users/onboarding", headers=headers, json={**ONBOARDING, "available_equipment": ["dumbbells"]})
    return headers, user_id


def _fixed_today(monkeypatch, exercises):
    async def fake_today(user):
        return {"day": "thursday", "focus": "Lower body", "workout_type": "strength", "exercises": exercises,
                "mode": "normal", "quick": False, "recovery_score": None, "has_plan": True}
    monkeypatch.setattr(workout_service, "get_today_workout", fake_today)


def _seed(user_id, days_ago, sets, exercise_id="Goblet_Squat", pattern="squat", felt=None):
    day = (local_today() - timedelta(days=days_ago)).isoformat()
    asyncio.run(store.save_session(user_id, exercise_id, exercise_id.replace("_", " "), pattern, day,
                                   [{"weight_kg": w, "reps": r} for w, r in sets], felt))


def test_today_shows_last_time_and_the_next_target(client, monkeypatch):
    headers, user_id = _onboard(client)
    _fixed_today(monkeypatch, [GOBLET])
    first = client.get(f"{API}/workouts/plan/today", headers=headers).json()["data"]
    assert first["exercises"][0]["target"]["action"] == "first_time"

    _seed(user_id, 5, [(16, 12), (16, 12), (16, 12)])
    _seed(user_id, 2, [(16, 12), (16, 12), (16, 12)])
    target = client.get(f"{API}/workouts/plan/today", headers=headers).json()["data"]["exercises"][0]["target"]
    assert target["action"] == "add_weight" and target["weight_kg"] == 17.5
    assert target["loaded"] is True
    assert [s["reps"] for s in target["last"]["sets"]] == [12, 12, 12]


def test_logging_sets_returns_personal_records(client):
    headers, user_id = _onboard(client, "records@example.com")
    _seed(user_id, 3, [(16, 10), (16, 10)])
    res = client.post(f"{API}/workouts/log", headers=headers, json={
        "duration_minutes": 40,
        "exercises": [
            {**GOBLET, "sets_completed": 2, "sets_total": 3,
             "sets": [{"weight_kg": 20, "reps": 10}, {"weight_kg": 20, "reps": 9}, {"weight_kg": -5, "reps": 3}]},
            {"name": "Old client exercise", "sets_completed": 3, "sets_total": 3},
        ],
    })
    assert res.status_code == 200, res.json()
    records = res.json()["data"]["new_records"]
    assert records == [{"exercise_id": "Goblet_Squat", "name": "Goblet Squat", "kind": "weight", "value": 20, "previous": 16}]
    history = client.get(f"{API}/workouts/exercises/Goblet_Squat/history", headers=headers).json()["data"]
    # The invalid set was dropped; the session is stored once.
    assert [len(s["sets"]) for s in history["sessions"]] == [2, 2]
    assert client.get(f"{API}/workouts/exercises/Nope/history", headers=headers).status_code == 404


def test_bodyweight_sets_are_stored_without_weight(client):
    headers, user_id = _onboard(client, "bodyweight@example.com")
    client.post(f"{API}/workouts/log", headers=headers, json={"exercises": [
        {"exercise_id": "Pushups", "name": "Pushups", "sets": [{"weight_kg": 10, "reps": 15}]},
    ]})
    history = client.get(f"{API}/workouts/exercises/Pushups/history", headers=headers).json()["data"]
    assert history["loaded"] is False
    assert history["sessions"][0]["sets"] == [{"weight_kg": 0.0, "reps": 15}]


def test_easy_week_trims_sets_and_keeps_weights(client, monkeypatch):
    headers, user_id = _onboard(client, "deload@example.com")
    _fixed_today(monkeypatch, [GOBLET])
    _seed(user_id, 5, [(16, 12), (16, 12), (16, 12)])
    _seed(user_id, 2, [(16, 12), (16, 12), (16, 12)])
    started = client.post(f"{API}/workouts/deload", headers=headers).json()["data"]
    assert started["deload_until"] > local_today().isoformat()
    today = client.get(f"{API}/workouts/plan/today", headers=headers).json()["data"]
    exercise = today["exercises"][0]
    assert exercise["sets"] == 2 and "Easy week" in exercise["effort"]
    assert exercise["target"]["action"] == "deload" and exercise["target"]["weight_kg"] == 16
    assert today["deload_until"] == started["deload_until"]
    client.delete(f"{API}/workouts/deload", headers=headers)
    assert client.get(f"{API}/workouts/plan/today", headers=headers).json()["data"]["exercises"][0]["sets"] == 3


def test_stalled_lifts_suggest_an_easy_week(client):
    headers, user_id = _onboard(client, "stalled@example.com")
    for exercise_id, pattern in (("Goblet_Squat", "squat"), ("Dumbbell_Bench_Press", "push_horizontal")):
        _seed(user_id, 40, [(20, 10)], exercise_id, pattern)
        for days_ago in (16, 12, 8, 4):
            _seed(user_id, days_ago, [(20, 9)], exercise_id, pattern)
    # Short sleep on the check-ins during the stall: named as a likely reason.
    for days_ago in (6, 4, 2):
        day = (local_today() - timedelta(days=days_ago)).isoformat()
        asyncio.run(RecoveryLog(user_id, 5.5, 2, 4, 4, score=45, log_date=day).save())
    data = client.get(f"{API}/workouts/progression", headers=headers).json()["data"]
    assert data["deload"] and len(data["deload"]["stalled_lifts"]) == 2
    kinds = [r["kind"] for r in data["deload"]["reasons"]]
    assert kinds == ["sleep", "recovery"]  # no meals logged, so protein isn't guessed
    client.post(f"{API}/workouts/progression/deload/snooze", headers=headers)
    assert client.get(f"{API}/workouts/progression", headers=headers).json()["data"]["deload"] is None
    assert client.post(f"{API}/workouts/progression/other/snooze", headers=headers).status_code == 400


def test_level_up_only_when_ready(client):
    headers, user_id = _onboard(client, "levels@example.com")
    data = client.get(f"{API}/workouts/progression", headers=headers).json()["data"]
    assert data["level"]["next_level"] == "advanced" and not data["level"]["ready"]
    assert data["level"]["workouts_needed"] == progression.workouts_needed("advanced", data["level"]["days_per_week"])
    res = client.post(f"{API}/workouts/level-up", headers=headers)
    assert res.status_code == 400


def test_strength_summary_tracks_weighted_lifts(client):
    headers, user_id = _onboard(client, "strength@example.com")
    _seed(user_id, 30, [(16, 10)])
    _seed(user_id, 10, [(18, 10)])
    _seed(user_id, 1, [(20, 10)])
    _seed(user_id, 1, [(0, 20)], "Pushups", "push_horizontal")
    lifts = client.get(f"{API}/workouts/strength", headers=headers).json()["data"]["lifts"]
    assert [lift["exercise_id"] for lift in lifts] == ["Goblet_Squat"]
    assert lifts[0]["change_percent"] == 25
    assert lifts[0]["current_estimated_max_kg"] == 26.7
