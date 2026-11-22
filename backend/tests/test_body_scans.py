"""Body composition scans: reading, review, history, profile, and the workout plan built around them."""
import asyncio
import itertools
import json

import pytest

from app.health import body_composition as bc
from app.health import crypto
from app.models import lab_report as model
from app.workouts import planner
from tests.conftest import ONBOARDING, register_and_login
from tests.health_helpers import API, grant, make_pdf, use_encryption_key

INBODY_LINES = [
    "InBody 270 Body Composition Analysis",
    "Test Date 01/11/2026",
    "Weight 78.4 kg",
    "Skeletal Muscle Mass 33.2 kg",
    "Body Fat Mass 19.6 kg",
    "Percent Body Fat 25.0 %",
    "Visceral Fat Level 11",
    "Basal Metabolic Rate 1688 kcal",
]
SEGMENTS = {
    "right_arm": {"lean_kg": 3.6, "lean_percent": 98},
    "left_arm": {"lean_kg": 3.3, "lean_percent": 90},
    "trunk": {"lean_kg": 26.0, "lean_percent": 95},
    "right_leg": {"lean_kg": 9.0, "lean_percent": 86},
    "left_leg": {"lean_kg": 9.1, "lean_percent": 88},
}


def _user(client, email, **overrides):
    headers, user_id = register_and_login(client, email)
    client.post(f"{API}/users/onboarding", headers=headers,
                json={**ONBOARDING, "available_equipment": ["full_gym"], "workout_days_per_week": 4, **overrides})
    grant(client, headers, "health_reports")
    return headers, user_id


def _upload_scan(client, headers, content, name="inbody.pdf", mime="application/pdf", allow_ai=True):
    return client.post(f"{API}/lab-reports", headers=headers, files={"file": (name, content, mime)},
                       data={"allow_ai": str(allow_ai).lower(), "kind": "body_composition"})


# --- Analysis ---------------------------------------------------------------------
def test_analysis_finds_the_weaker_side_lagging_areas_and_high_fat():
    scan = bc.BodyScan(weight_kg=78.4, body_fat_percent=25.0, visceral_fat_level=11, segments=SEGMENTS)
    result = bc.analyse(scan, "male")
    codes = {f["code"] for f in result["findings"]}
    assert {"body_fat_high", "visceral_high", "arm_imbalance", "legs_lagging"} <= codes
    assert result["training"] == {"areas": ["arms", "legs"], "weaker": {"arm": "left"}, "conditioning": True}
    assert result["segment_status"]["right_leg"] == "under"


def test_a_balanced_lean_scan_asks_for_nothing_extra():
    even = {name: {"lean_kg": 10.0, "lean_percent": 102} for name in bc.SEGMENTS}
    result = bc.analyse(bc.BodyScan(weight_kg=70, body_fat_percent=15, visceral_fat_level=4, segments=even), "male")
    assert result["training"] == {"areas": [], "weaker": {}, "conditioning": False}
    assert result["body_fat_category"] == "fitness"
    # The same body fat is "athletic" on the women's chart.
    assert bc.fat_category(18, "female") == "athletic"


def test_implausible_readings_are_dropped_not_the_whole_scan():
    clean = bc.sanitize({"weight_kg": 78.4, "body_fat_percent": 250, "visceral_fat_level": 11,
                         "segments": {"left_arm": {"lean_kg": 3.3, "lean_percent": 5000}, "tail": {"lean_kg": 1}}})
    assert clean["weight_kg"] == 78.4 and "body_fat_percent" not in clean
    assert clean["segments"] == {"left_arm": {"lean_kg": 3.3}}


# --- Reading a printout ------------------------------------------------------------
def test_printed_values_are_read_and_ai_adds_the_segments(client, ai_providers):
    headers, _ = _user(client, "scan-read@example.com")
    ai_providers.gemini.append(json.dumps({
        "weight_kg": 80.0,  # Printed labels win over AI.
        "segments": [{"segment": "Left Arm", "lean_kg": 3.3, "lean_percent": 90},
                     {"segment": "right_arm", "lean_kg": 3.6, "lean_percent": 98}],
    }))
    report = _upload_scan(client, headers, make_pdf(INBODY_LINES)).json()["data"]
    assert report["kind"] == "body_composition" and report["status"] == "needs_review"
    draft = report["scan_draft"]
    assert draft["weight_kg"] == 78.4 and draft["skeletal_muscle_mass_kg"] == 33.2
    assert draft["visceral_fat_level"] == 11 and draft["bmr_kcal"] == 1688
    assert draft["segments"]["left_arm"] == {"lean_kg": 3.3, "lean_percent": 90}
    assert report["report_date"] == "2026-11-01"
    assert report["methods"] == ["local", "ai"]
    # Nothing is history until it's checked.
    assert client.get(f"{API}/body-scans", headers=headers).json()["data"] == []


# --- Saving and history ------------------------------------------------------------
def test_a_checked_scan_is_saved_and_updates_body_fat_in_the_profile(client, ai_providers):
    headers, _ = _user(client, "scan-save@example.com")
    report = _upload_scan(client, headers, make_pdf(INBODY_LINES), allow_ai=False).json()["data"]
    scan = {**report["scan_draft"], "segments": SEGMENTS, "measured_at": "2026-11-01"}
    res = client.post(f"{API}/lab-reports/{report['id']}/confirm-scan", headers=headers,
                      json={"scan": scan, "use_for_profile": True})
    assert res.status_code == 200, res.text
    saved = res.json()["data"]
    assert "body_fat_percent" in saved["profile_updated"]
    assert saved["scan"]["analysis"]["training"]["weaker"] == {"arm": "left"}
    profile = client.get(f"{API}/users/profile", headers=headers).json()["data"]
    assert profile["body_fat_percent"] == 25.0
    # Calorie targets now come from lean mass (Katch-McArdle).
    targets = client.get(f"{API}/users/targets", headers=headers).json()["data"]["targets"]
    notes = [n["code"] for n in targets["notes"]]
    assert "bmr_katch" in notes
    listed = client.get(f"{API}/lab-reports", headers=headers).json()["data"][0]
    assert listed["status"] == "confirmed"
    again = client.post(f"{API}/lab-reports/{report['id']}/confirm-scan", headers=headers, json={"scan": scan})
    assert again.status_code == 400


def test_history_shows_what_changed_and_typing_one_in_works(client):
    headers, _ = _user(client, "scan-history@example.com")
    client.post(f"{API}/body-scans", headers=headers, json={"use_for_profile": False, "scan": {
        "measured_at": "2026-08-01", "weight_kg": 80.0, "skeletal_muscle_mass_kg": 32.0, "body_fat_percent": 27.0}})
    client.post(f"{API}/body-scans", headers=headers, json={"use_for_profile": False, "scan": {
        "measured_at": "2026-11-01", "weight_kg": 78.4, "skeletal_muscle_mass_kg": 33.2, "body_fat_percent": 25.0}})
    scans = client.get(f"{API}/body-scans", headers=headers).json()["data"]
    assert [s["measured_at"] for s in scans] == ["2026-11-01", "2026-08-01"]
    assert scans[0]["changes"] == {"weight_kg": -1.6, "skeletal_muscle_mass_kg": 1.2, "body_fat_percent": -2.0,
                                   "body_fat_mass_kg": -2.0}
    empty = client.post(f"{API}/body-scans", headers=headers, json={"scan": {"device": "InBody"}})
    assert empty.status_code == 400


def test_scans_are_encrypted_and_go_with_their_report(client, monkeypatch, mock_db):
    use_encryption_key(monkeypatch)
    headers, user_id = _user(client, "scan-private@example.com")
    report = _upload_scan(client, headers, make_pdf(INBODY_LINES), allow_ai=False).json()["data"]
    client.post(f"{API}/lab-reports/{report['id']}/confirm-scan", headers=headers,
                json={"scan": report["scan_draft"], "use_for_profile": False})
    raw = asyncio.run(model.list_scans_raw(user_id))
    assert raw[0]["data"].startswith(crypto.PREFIX) and "weight_kg" not in raw[0]
    client.delete(f"{API}/lab-reports/{report['id']}", headers=headers)
    assert client.get(f"{API}/body-scans", headers=headers).json()["data"] == []


def test_withdrawing_consent_deletes_scans(client, mock_db):
    headers, user_id = _user(client, "scan-withdraw@example.com")
    client.post(f"{API}/body-scans", headers=headers, json={"scan": {"weight_kg": 70}, "use_for_profile": False})
    client.delete(f"{API}/consents/health_reports", headers=headers)
    assert asyncio.run(mock_db["body_scans"].count_documents({"user_id": user_id})) == 0


# --- Training around the scan ----------------------------------------------------
def test_focus_work_comes_after_the_main_lifts_and_is_never_cut():
    week = planner.build_week(goal="muscle_gain", experience="intermediate", equipment=["full_gym"], injuries=[],
                              days_per_week=4, focus={"areas": ["arms", "legs"], "weaker": {"arm": "left"},
                                                      "conditioning": True, "scan_id": "s1"})["week"]
    upper = next(d for d in week if d["focus"] == "Upper body")
    lower = next(d for d in week if d["focus"] == "Lower body")
    arm_work = [e for e in upper["exercises"] if e.get("focus_area") == "arms"]
    assert [e["pattern"] for e in arm_work] == ["biceps", "triceps"]
    # The weaker left arm: single-arm exercises, started on the left, with an extra set.
    assert all(e["per_side"] and e["weaker_side"] == "left" for e in arm_work)
    assert upper["exercises"].index(arm_work[0]) == planner.LEAD_SLOTS
    leg_work = [e for e in lower["exercises"] if e.get("focus_area") == "legs"]
    assert {e["pattern"] for e in leg_work} == {"lunge", "knee_extension"}
    assert "weaker_side" not in leg_work[0]  # Legs are even, just lagging.
    assert upper["finisher"]["minutes"] == planner.FINISHER_MINUTES


def test_everyday_plans_keep_two_sided_exercises():
    week = planner.build_week(goal="muscle_gain", experience="intermediate", equipment=["full_gym"], injuries=[],
                              days_per_week=4)["week"]
    used = {e["exercise_id"] for d in week for e in d["exercises"]}
    assert not used & planner.FOCUS_ONLY
    assert all("finisher" not in d for d in week)


def test_a_new_plan_trains_around_the_newest_scan(client, ai_providers):
    headers, _ = _user(client, "scan-plan@example.com")
    client.post(f"{API}/body-scans", headers=headers, json={"use_for_profile": False, "scan": {
        "measured_at": "2026-11-01", "weight_kg": 78.4, "body_fat_percent": 25.0, "segments": SEGMENTS}})
    plan = client.post(f"{API}/workouts/generate", headers=headers, json={}).json()["data"]["weekly_plan"]
    assert plan["meta"]["body_scan"]["areas"] == ["arms", "legs"]
    assert "body_scan_focus" in plan["meta"]["notes"] and plan["scan_changed"] is False
    assert any(e.get("weaker_side") == "left" for d in plan["week"] for e in d["exercises"])

    # A newer scan flags the plan until a new one is made.
    client.post(f"{API}/body-scans", headers=headers, json={"use_for_profile": False, "scan": {
        "measured_at": "2026-11-10", "weight_kg": 78.0}})
    assert client.get(f"{API}/workouts/plan/week", headers=headers).json()["data"]["plan"]["scan_changed"] is True
    fresh = client.post(f"{API}/workouts/generate", headers=headers, json={}).json()["data"]["weekly_plan"]
    assert fresh["scan_changed"] is False


def test_the_coach_sees_the_scan(client):
    from app.services import health_profile_service

    headers, user_id = _user(client, "scan-coach@example.com")
    client.post(f"{API}/body-scans", headers=headers, json={"use_for_profile": False, "scan": {
        "measured_at": "2026-11-01", "weight_kg": 78.4, "body_fat_percent": 25.0, "segments": SEGMENTS}})
    text = asyncio.run(health_profile_service.health_context(user_id))
    assert "body composition scan (2026-11-01)" in text
    assert "left arm has less muscle" in text


SETUPS = [["full_gym"], ["dumbbells", "bench"], ["dumbbells"], ["resistance_bands", "pull_up_bar"], ["kettlebell"], []]
FOCI = [{"areas": ["arms"], "weaker": {"arm": "left"}}, {"areas": ["legs"], "weaker": {"leg": "right"}},
        {"areas": ["trunk"], "weaker": {}}, {"areas": ["arms", "legs", "trunk"], "weaker": {}}]


@pytest.mark.parametrize("owned", SETUPS)
@pytest.mark.parametrize("injuries", [[], ["knee pain"], ["shoulder"], ["lower back"]])
def test_focus_never_compromises_the_plan(owned, injuries):
    """Whatever the kit and injuries: every focus area gets its work, an unbalanced
    limb is trained one side at a time, and nothing the plain plan trained is cut."""
    from collections import Counter

    for focus, level, days in itertools.product(FOCI, ["beginner", "intermediate"], [3, 4, 6]):
        kw = dict(goal="muscle_gain", experience=level, equipment=owned, injuries=injuries, days_per_week=days)
        plain = planner.build_week(**kw)["week"]
        focused = planner.build_week(**kw, focus={**focus, "scan_id": "s"})["week"]
        for p_day, f_day in zip(plain, focused):
            if f_day["workout_type"] != "strength":
                continue
            session = next(k for k, v in planner.SESSION_LABELS.items() if v == f_day["focus"])
            wanted = [a for _, a in planner.session_slots(session, focus["areas"]) if a]
            got = [e for e in f_day["exercises"] if e.get("focus_area")]
            where = f"{owned}/{injuries}/{level}/{days}d/{f_day['day']}/{focus['areas']}"
            assert {e["focus_area"] for e in got} == set(wanted), where
            for e in got:
                limb = planner.FOCUS_LIMB.get(e["focus_area"])
                if limb and limb in focus["weaker"]:
                    assert e["per_side"], f"{where}: {e['name']}"
            lost = Counter(e["pattern"] for e in p_day["exercises"]) - Counter(e["pattern"] for e in f_day["exercises"])
            assert not lost, f"{where}: lost {dict(lost)}"


# --- Goal advice -----------------------------------------------------------------
def test_scan_suggests_a_better_goal_only_when_they_pull_apart():
    high = bc.analyse(bc.BodyScan(weight_kg=90, body_fat_percent=30), "male")
    assert bc.goal_advice(high, "muscle_gain") == {
        "goal": "muscle_gain", "suggested": "recomposition", "reason": "surplus_with_high_fat"}
    # Recomposition and fat loss already suit high body fat.
    assert bc.goal_advice(high, "recomposition") is None
    assert bc.goal_advice(high, "fat_loss") is None
    visceral = bc.analyse(bc.BodyScan(weight_kg=80, body_fat_percent=20, visceral_fat_level=12), "male")
    assert bc.goal_advice(visceral, "muscle_gain")["suggested"] == "recomposition"
    very_lean = bc.analyse(bc.BodyScan(weight_kg=60, body_fat_percent=4), "male")
    assert bc.goal_advice(very_lean, "fat_loss")["suggested"] == "muscle_gain"
    assert bc.goal_advice(very_lean, "muscle_gain") is None
    fit = bc.analyse(bc.BodyScan(weight_kg=75, body_fat_percent=15), "male")
    assert all(bc.goal_advice(fit, g) is None for g in ("muscle_gain", "fat_loss", "recomposition"))


def test_only_the_newest_scan_carries_goal_advice(client):
    headers, _ = _user(client, "scan-goal@example.com", fitness_goal="muscle_gain")
    for day, fat in (("2026-08-01", 18.0), ("2026-11-01", 30.0)):
        client.post(f"{API}/body-scans", headers=headers, json={"use_for_profile": False, "scan": {
            "measured_at": day, "weight_kg": 90.0, "body_fat_percent": fat}})
    scans = client.get(f"{API}/body-scans", headers=headers).json()["data"]
    assert scans[0]["goal_advice"]["suggested"] == "recomposition"
    assert "goal_advice" not in scans[1]
    # Once the goal is changed, the advice goes away.
    client.put(f"{API}/settings/profile", headers=headers, json={"fitness_goal": "recomposition"})
    assert client.get(f"{API}/body-scans", headers=headers).json()["data"][0]["goal_advice"] is None
