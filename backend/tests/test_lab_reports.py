import asyncio
import json

from app.ai import client as ai_client
from app.health import crypto, extraction
from app.models import lab_report as model
from tests.conftest import register_and_login
from tests.health_helpers import API, PNG_BYTES, SAMPLE_REPORT_LINES, grant, make_pdf, use_encryption_key


def _upload(client, headers, content, name="report.pdf", allow_ai=True, mime="application/pdf"):
    return client.post(
        f"{API}/lab-reports", headers=headers,
        files={"file": (name, content, mime)}, data={"allow_ai": str(allow_ai).lower()},
    )


def _consented(client, email="labs@example.com"):
    headers, user_id = register_and_login(client, email)
    grant(client, headers, "health_reports")
    return headers, user_id


# --- Local extraction -----------------------------------------------------------
def test_local_extraction_reads_common_biomarkers_with_units():
    text = "\n".join(SAMPLE_REPORT_LINES + [
        "Serum Ferritin 18 ng/mL", "Total Iron Binding Capacity 400 ug/dL",
        "Triglycerides 1.9 mmol/L", "TSH 3.1 uIU/mL", "Haemoglobin 12.1 g/dL",
    ])
    drafts = {d["code"]: d for d in extraction.extract_local(text)}
    assert drafts["hba1c"]["value"] == 6.8 and drafts["hba1c"]["unit"] == "%"
    assert (drafts["hba1c"]["ref_low"], drafts["hba1c"]["ref_high"]) == (4.0, 5.6)
    assert drafts["fasting_glucose"]["value"] == 112
    assert drafts["hdl"]["value"] == 38  # The ratio line isn't read as HDL.
    assert drafts["vitamin_d"]["value"] == 14.2  # "25-OH" isn't read as the value.
    assert drafts["triglycerides"]["value"] == round(1.9 * 88.57, 2)  # mmol/L converted to mg/dL
    assert drafts["tsh"]["unit"] == "mIU/L"
    assert "iron" not in drafts  # TIBC isn't serum iron.
    assert all(d["source"] == "local" for d in drafts.values())
    assert extraction.find_report_date(text) == "2026-10-03"


# --- Upload, consent and verification -------------------------------------------
def test_upload_needs_consent(client):
    headers, _ = register_and_login(client)
    res = _upload(client, headers, make_pdf(SAMPLE_REPORT_LINES))
    assert res.status_code == 403
    assert client.get(f"{API}/biomarkers", headers=headers).status_code == 403


def test_upload_makes_drafts_and_nothing_is_saved_until_confirmed(client, ai_providers):
    headers, _ = _consented(client)
    res = _upload(client, headers, make_pdf(SAMPLE_REPORT_LINES), allow_ai=False)
    assert res.status_code == 200, res.text
    report = res.json()["data"]
    assert report["status"] == "needs_review"
    assert report["methods"] == ["local"]
    assert report["report_date"] == "2026-10-03"
    assert {d["code"] for d in report["drafts"]} >= {"hba1c", "fasting_glucose", "vitamin_b12", "vitamin_d"}
    assert "file_key" not in report and "user_id" not in report
    assert ai_providers.calls == []  # The user said no to AI.
    # Drafts are not history.
    assert client.get(f"{API}/biomarkers", headers=headers).json()["data"] == []


def test_only_confirmed_values_are_saved(client):
    headers, _ = _consented(client)
    report = _upload(client, headers, make_pdf(SAMPLE_REPORT_LINES), allow_ai=False).json()["data"]
    drafts = {d["code"]: d for d in report["drafts"]}
    b12 = drafts["vitamin_b12"]
    hba1c = {**drafts["hba1c"], "value": 6.9}  # The user corrected a misread.
    res = client.post(f"{API}/lab-reports/{report['id']}/confirm", headers=headers, json={
        "report_date": "2026-10-03",
        "values": [
            {k: hba1c[k] for k in ("code", "name", "value", "unit", "ref_low", "ref_high")},
            {k: b12[k] for k in ("code", "name", "value", "unit", "ref_low", "ref_high")},
        ],
    })
    assert res.status_code == 200, res.text
    assert res.json()["data"]["saved"] == 2
    assert res.json()["data"]["report"]["status"] == "confirmed"
    assert res.json()["data"]["report"]["drafts"] == []

    history = client.get(f"{API}/biomarkers", headers=headers).json()["data"]
    by_code = {g["code"]: g for g in history}
    assert set(by_code) == {"hba1c", "vitamin_b12"}
    assert by_code["hba1c"]["latest"]["value"] == 6.9
    assert by_code["hba1c"]["latest"]["status"] == "high"
    assert by_code["vitamin_b12"]["latest"]["status"] == "low"
    assert by_code["hba1c"]["latest"]["date"] == "2026-10-03"
    assert by_code["hba1c"]["about"] and by_code["hba1c"]["source"]
    # Confirming twice isn't allowed.
    again = client.post(f"{API}/lab-reports/{report['id']}/confirm", headers=headers, json={"values": []})
    assert again.status_code == 400


def test_standard_range_is_used_when_the_lab_printed_none(client):
    headers, _ = _consented(client)
    report = _upload(client, headers, make_pdf(SAMPLE_REPORT_LINES), allow_ai=False).json()["data"]
    vit_d = next(d for d in report["drafts"] if d["code"] == "vitamin_d")
    assert (vit_d["ref_low"], vit_d["ref_high"], vit_d["ref_source"]) == (20, 50, "standard")


def test_ai_reads_what_local_extraction_missed(client, ai_providers):
    headers, _ = _consented(client)
    ai_providers.gemini.append(json.dumps({
        "report_date": "2026-09-15",
        "lab": "Test Lab",
        "values": [
            {"name": "Serum Creatinine", "value": 0.9, "unit": "mg/dL", "ref_low": 0.7, "ref_high": 1.3},
            {"name": "Glycated Haemoglobin", "value": 6.8, "unit": "%"},
            {"name": "Homocysteine", "value": 18, "unit": "umol/L", "ref_high": 15},
        ],
    }))
    pdf = make_pdf(["Results", "Glycated Haemoglobin 6.8 %", "S. Creatinine level is reported below",
                    "Homocysteine 18 umol/L"])
    report = _upload(client, headers, pdf).json()["data"]
    assert report["methods"] == ["local", "ai"]
    by_code = {d["code"]: d for d in report["drafts"]}
    assert by_code["hba1c"]["source"] == "local"  # Local results win.
    assert by_code["creatinine"]["source"] == "ai"
    assert by_code["creatinine"]["ref_source"] == "lab"
    assert by_code["other_homocysteine"]["name"] == "Homocysteine"
    assert report["lab"] == "Test Lab"
    # The AI got the report text, never a diagnosis request.
    assert "Glycated Haemoglobin 6.8" in ai_providers.calls[0]["prompt"]


def test_images_are_read_by_the_vision_model(client, ai_providers, monkeypatch):
    seen = {}

    async def fake_vision(prompt, system, image, mime_type):
        seen["mime"] = mime_type
        return json.dumps({"values": [{"name": "Vitamin B12", "value": 150, "unit": "pmol/L"}]})

    monkeypatch.setitem(ai_client._VISION_PROVIDERS, ai_client.PROVIDER_GEMINI, fake_vision)
    headers, _ = _consented(client)
    report = _upload(client, headers, PNG_BYTES, name="report.png", mime="image/png").json()["data"]
    assert seen["mime"] == "image/png"
    b12 = report["drafts"][0]
    assert b12["code"] == "vitamin_b12"
    assert b12["value"] == round(150 * 1.355, 2) and b12["unit"] == "pg/mL"


def test_ai_failure_still_gives_a_report_to_fill_in(client, ai_providers):
    headers, _ = _consented(client)
    report = _upload(client, headers, PNG_BYTES, name="scan.png", mime="image/png").json()["data"]
    assert report["status"] == "needs_review"
    assert report["drafts"] == []
    assert report["ai_error"] == "unavailable"


def test_unsupported_and_oversized_files_are_rejected(client):
    headers, _ = _consented(client)
    assert _upload(client, headers, b"hello world", name="notes.txt", mime="text/plain").status_code == 400
    big = b"%PDF" + b"0" * (10 * 1024 * 1024 + 10)
    assert _upload(client, headers, big).status_code == 400


def test_original_file_can_be_opened_privately(client):
    headers, _ = _consented(client)
    pdf = make_pdf(SAMPLE_REPORT_LINES)
    report = _upload(client, headers, pdf, allow_ai=False).json()["data"]
    link = client.get(f"{API}/lab-reports/{report['id']}/file-link", headers=headers).json()["data"]
    assert link["url"] is None  # No R2 in tests: served through the API instead.
    res = client.get(f"{API}/lab-reports/{report['id']}/file", headers=headers)
    assert res.status_code == 200 and res.content == pdf
    other, _ = register_and_login(client, "someone@example.com")
    grant(client, other, "health_reports")
    assert client.get(f"{API}/lab-reports/{report['id']}/file", headers=other).status_code == 404


def test_values_and_files_are_encrypted_at_rest(client, monkeypatch, mock_db):
    use_encryption_key(monkeypatch)
    headers, user_id = _consented(client)
    pdf = make_pdf(SAMPLE_REPORT_LINES)
    report = _upload(client, headers, pdf, allow_ai=False).json()["data"]
    raw_report = asyncio.run(model.get_report_raw(user_id, report["id"]))
    assert raw_report["data"].startswith(crypto.PREFIX)
    file_doc = asyncio.run(mock_db["health_report_files"].find_one({"report_id": report["id"]}))
    assert file_doc["encrypted"] is True and bytes(file_doc["content"]) != pdf

    draft = next(d for d in report["drafts"] if d["code"] == "vitamin_b12")
    client.post(f"{API}/lab-reports/{report['id']}/confirm", headers=headers, json={"values": [
        {k: draft[k] for k in ("code", "name", "value", "unit")}]})
    raw_values = asyncio.run(model.list_biomarkers_raw(user_id))
    assert raw_values[0]["data"].startswith(crypto.PREFIX)
    assert "value" not in raw_values[0] and raw_values[0]["code"] == "vitamin_b12"
    assert client.get(f"{API}/biomarkers", headers=headers).json()["data"][0]["latest"]["value"] == 180
    assert client.get(f"{API}/lab-reports/{report['id']}/file", headers=headers).content == pdf


def test_deleting_a_report_removes_its_file_and_values(client, mock_db):
    headers, user_id = _consented(client)
    report = _upload(client, headers, make_pdf(SAMPLE_REPORT_LINES), allow_ai=False).json()["data"]
    draft = report["drafts"][0]
    client.post(f"{API}/lab-reports/{report['id']}/confirm", headers=headers, json={"values": [
        {k: draft[k] for k in ("code", "name", "value", "unit")}]})
    client.post(f"{API}/biomarkers", headers=headers,
                json={"name": "Ferritin", "value": 40, "unit": "ng/mL", "measured_at": "2026-08-01"})

    assert client.delete(f"{API}/lab-reports/{report['id']}", headers=headers).status_code == 200
    assert client.get(f"{API}/lab-reports", headers=headers).json()["data"] == []
    codes = [g["code"] for g in client.get(f"{API}/biomarkers", headers=headers).json()["data"]]
    assert codes == ["ferritin"]  # The manual value stays; the report's values are gone.
    assert asyncio.run(mock_db["health_report_files"].count_documents({})) == 0


def test_withdrawing_report_consent_deletes_everything(client, mock_db):
    headers, user_id = _consented(client)
    _upload(client, headers, make_pdf(SAMPLE_REPORT_LINES), allow_ai=False)
    client.post(f"{API}/biomarkers", headers=headers, json={"name": "HbA1c", "value": 5.4, "unit": "%"})
    res = client.delete(f"{API}/consents/health_reports", headers=headers)
    assert res.status_code == 200 and res.json()["data"]["deleted"] >= 3
    for collection in ("health_reports", "health_report_files", "biomarkers"):
        assert asyncio.run(mock_db[collection].count_documents({"user_id": user_id})) == 0


def test_account_deletion_includes_lab_reports(client, mock_db):
    headers, user_id = _consented(client)
    _upload(client, headers, make_pdf(SAMPLE_REPORT_LINES), allow_ai=False)
    client.post(f"{API}/biomarkers", headers=headers, json={"name": "HbA1c", "value": 5.4, "unit": "%"})
    assert client.delete(f"{API}/settings/account", headers=headers).status_code == 200
    for collection in ("health_reports", "health_report_files", "biomarkers", "consents"):
        assert asyncio.run(mock_db[collection].count_documents({"user_id": user_id})) == 0


def test_confirmed_high_blood_sugar_shapes_meal_plan_rules(client):
    headers, user_id = _consented(client)
    client.post(f"{API}/biomarkers", headers=headers, json={"name": "HbA1c", "value": 6.1, "unit": "%"})
    from app.services import health_profile_service

    flags = asyncio.run(health_profile_service.health_flags(user_id))
    assert {"high_hba1c", "blood_sugar_high"} <= flags
