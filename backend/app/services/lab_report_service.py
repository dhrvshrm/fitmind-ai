"""Lab reports ("health reports"): upload, draft extraction, verification, history.

Not to be confused with report_service (weekly progress reports).

Flow:
1. Upload (PDF or image, needs ``health_reports`` consent). The file is kept
   privately: in R2 when configured (read through short-lived signed URLs),
   otherwise encrypted in the database (development fallback).
2. Extraction makes DRAFT values (app/health/extraction.py).
3. The user reviews, edits or removes each value and confirms. Only confirmed
   values become biomarker history; AI never writes to it directly.
4. Deleting a report deletes its file and the values confirmed from it.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.health import biomarkers as bm
from app.health import extraction
from app.models import audit
from app.models import lab_report as model
from app.models.user import User
from app.services import cloud_service, consent_service
from app.services.consent_service import SCOPE_HEALTH_REPORTS
from app.utils.time import local_today_iso

logger = logging.getLogger(__name__)

MAX_FILE_BYTES = 10 * 1024 * 1024
# Allowed types, checked against the file's first bytes rather than trusting the name.
FILE_SIGNATURES = {
    "application/pdf": (b"%PDF",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),
}
EXTENSIONS = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
SIGNED_URL_SECONDS = 300


class LabReportError(Exception):
    """A lab report request that can't be completed; ``kind`` maps to the HTTP status."""

    def __init__(self, message: str, kind: str = "invalid"):
        super().__init__(message)
        self.kind = kind


def detect_type(content: bytes, declared: Optional[str]) -> str:
    """The file's real type from its signature.

    Raises:
        LabReportError: when it isn't a PDF, JPEG, PNG or WebP.
    """
    for mime, signatures in FILE_SIGNATURES.items():
        if any(content.startswith(sig) for sig in signatures):
            if mime == "image/webp" and content[8:12] != b"WEBP":
                continue
            return mime
    raise LabReportError("Upload a PDF or a photo (JPEG, PNG or WebP) of your report")


def _public(report: dict) -> dict:
    """A report as returned to the app (no storage details)."""
    hidden = {"user_id", "file_key", "extraction"}
    return {k: v for k, v in report.items() if k not in hidden}


async def _sex(user_id: str) -> Optional[str]:
    user = await User.get_by_id(user_id)
    return user.gender if user else None


def _with_reference(draft: dict, sex: Optional[str]) -> dict:
    """Fill a draft's range from the standard one when the lab didn't print one."""
    code = draft.get("code")
    if code in bm.BIOMARKERS and draft.get("ref_low") is None and draft.get("ref_high") is None:
        ref = bm.reference(code, sex)
        return {**draft, "ref_low": ref["low"], "ref_high": ref["high"], "ref_source": "standard"}
    return {**draft, "ref_source": draft.get("ref_source") or ("lab" if draft.get("ref_low") is not None
                                                                or draft.get("ref_high") is not None else None)}


async def upload(user_id: str, content: bytes, filename: str, declared_type: Optional[str],
                 allow_ai: bool) -> dict:
    """Store a report and extract draft values for review.

    Raises:
        ConsentRequired: without ``health_reports`` consent.
        LabReportError: for empty, oversized or unsupported files.
    """
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    if not content:
        raise LabReportError("The file is empty")
    if len(content) > MAX_FILE_BYTES:
        raise LabReportError("Files up to 10 MB can be uploaded")
    mime = detect_type(content, declared_type)

    report_id = str(uuid4())
    key = f"health_reports/{user_id}/{report_id}.{EXTENSIONS[mime]}"
    if cloud_service.is_private_storage_configured() and await cloud_service.upload_private(key, content, mime):
        storage = "r2"
    else:
        await model.save_file(user_id, report_id, content)
        storage = "database"

    result = await extraction.extract(user_id, content, mime, allow_ai)
    sex = await _sex(user_id)
    drafts = [{**_with_reference(d, sex), "id": str(uuid4())} for d in result["drafts"]]
    now = datetime.now(timezone.utc)
    public = {
        "id": report_id,
        "user_id": user_id,
        "mime_type": mime,
        "size": len(content),
        "storage": storage,
        "file_key": key if storage == "r2" else None,
        "status": model.STATUS_NEEDS_REVIEW,
        "methods": result["methods"],
        "ai_error": result["ai_error"],
        "created_at": now,
        "confirmed_at": None,
    }
    private = {
        "filename": (filename or "report")[:120],
        "report_date": result["report_date"],
        "lab": result["lab"],
        "drafts": drafts,
    }
    report = await model.create_report(public, private)
    await audit.record_change(user_id, "health_report", "upload", after={"status": public["status"]},
                              entity_id=report_id)
    return _public(report)


async def list_reports(user_id: str) -> List[dict]:
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    reports = await model.list_reports(user_id)
    return [_public({**r, "draft_count": len(r.get("drafts") or [])}) for r in reports]


async def get_report(user_id: str, report_id: str) -> dict:
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    report = await model.get_report(user_id, report_id)
    if report is None:
        raise LabReportError("Report not found", "not_found")
    return _public(report)


async def file_link(user_id: str, report_id: str) -> Dict[str, Any]:
    """How to open the original file: a short-lived signed URL (R2) or the API route."""
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    report = await model.get_report(user_id, report_id)
    if report is None:
        raise LabReportError("Report not found", "not_found")
    if report.get("storage") == "r2" and report.get("file_key"):
        url = await cloud_service.signed_url(report["file_key"], SIGNED_URL_SECONDS)
        if url:
            return {"url": url, "expires_in": SIGNED_URL_SECONDS, "mime_type": report["mime_type"]}
        raise LabReportError("The file is unavailable right now", "unavailable")
    return {"url": None, "expires_in": None, "mime_type": report["mime_type"]}


async def file_content(user_id: str, report_id: str) -> tuple:
    """(bytes, mime type) for a report stored in the database fallback."""
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    report = await model.get_report(user_id, report_id)
    if report is None:
        raise LabReportError("Report not found", "not_found")
    content = await model.get_file(user_id, report_id)
    if content is None:
        raise LabReportError("The file is stored privately; open it from the report", "not_found")
    return content, report["mime_type"]


def _clean_value(item: Dict[str, Any], report_date: Optional[str], sex: Optional[str]) -> dict:
    """A confirmed value in canonical units with its range."""
    code = item.get("code") if item.get("code") in bm.BIOMARKERS else bm.code_for_name(item["name"])
    measured = item.get("measured_at")
    measured_at = measured.isoformat() if hasattr(measured, "isoformat") else (measured or report_date)
    measured_at = measured_at or local_today_iso()
    if code:
        value, unit, _ = bm.to_canonical(code, float(item["value"]), item.get("unit"))
        ref_low, ref_high = item.get("ref_low"), item.get("ref_high")
        ref_source = "lab"
        if ref_low is None and ref_high is None:
            ref = bm.reference(code, sex)
            ref_low, ref_high, ref_source = ref["low"], ref["high"], "standard"
        name = bm.BIOMARKERS[code]["name"]
    else:
        code = (item.get("code") or "").strip() or f"other_{extraction._slug(item['name'])}"
        value, unit = float(item["value"]), item.get("unit") or ""
        ref_low, ref_high = item.get("ref_low"), item.get("ref_high")
        ref_source = "lab" if ref_low is not None or ref_high is not None else None
        name = item["name"].strip()
    return {
        "code": code, "name": name, "value": value, "unit": unit, "measured_at": measured_at,
        "ref_low": ref_low, "ref_high": ref_high, "ref_source": ref_source,
    }


async def confirm(user_id: str, report_id: str, report_date: Optional[str], values: List[dict]) -> dict:
    """Save the values the user checked as verified biomarker history.

    Only the values sent here are stored; unconfirmed drafts are discarded.

    Raises:
        LabReportError: if the report doesn't exist or was already confirmed.
    """
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    report = await model.get_report(user_id, report_id)
    if report is None:
        raise LabReportError("Report not found", "not_found")
    if report["status"] == model.STATUS_CONFIRMED:
        raise LabReportError("These values are already saved. Delete the report to start again")
    sex = await _sex(user_id)
    date_text = report_date or report.get("report_date")
    now = datetime.now(timezone.utc)
    saved = []
    for item in values:
        clean = _clean_value(item, date_text, sex)
        saved.append(await model.add_biomarker({
            **clean,
            "id": str(uuid4()),
            "user_id": user_id,
            "report_id": report_id,
            "source": "report",
            "verified": True,
            "created_at": now,
        }))
    private = {k: report.get(k) for k in ("filename", "lab")}
    private.update({"report_date": date_text, "drafts": []})
    await model.update_report(user_id, report_id,
                              {"status": model.STATUS_CONFIRMED, "confirmed_at": now,
                               "confirmed_count": len(saved)}, private)
    await audit.record_change(user_id, "health_report", "confirm", after={"values": len(saved)},
                              entity_id=report_id)
    return {"report": await get_report(user_id, report_id), "saved": len(saved)}


async def add_manual_value(user_id: str, item: Dict[str, Any]) -> dict:
    """A value typed in by the user (no report)."""
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    clean = _clean_value(item, None, await _sex(user_id))
    return await model.add_biomarker({
        **clean, "id": str(uuid4()), "user_id": user_id, "report_id": None,
        "source": "manual", "verified": True, "created_at": datetime.now(timezone.utc),
    })


async def delete_value(user_id: str, biomarker_id: str) -> None:
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    if not await model.delete_biomarker(user_id, biomarker_id):
        raise LabReportError("Value not found", "not_found")
    await audit.record_change(user_id, "biomarker", "delete", before={"exists": True}, after={},
                              entity_id=biomarker_id)


async def _delete_report_files(user_id: str, report: dict) -> None:
    if report.get("storage") == "r2" and report.get("file_key"):
        await cloud_service.delete_private(report["file_key"])
    await model.delete_file(user_id, report["id"])


async def delete_report(user_id: str, report_id: str) -> None:
    """Delete a report, its file and every value confirmed from it."""
    report = await model.get_report(user_id, report_id)
    if report is None:
        raise LabReportError("Report not found", "not_found")
    await _delete_report_files(user_id, report)
    await model.delete_biomarkers_for_report(user_id, report_id)
    await model.delete_report(user_id, report_id)
    await audit.record_change(user_id, "health_report", "delete", before={"exists": True}, after={},
                              entity_id=report_id)


async def delete_all(user_id: str) -> int:
    """Delete every report, file and value (used when consent is withdrawn)."""
    for report in await model.list_reports(user_id):
        if report.get("storage") == "r2" and report.get("file_key"):
            await cloud_service.delete_private(report["file_key"])
    return await model.delete_all(user_id)


def _status_of(item: dict) -> str:
    return bm.status(item.get("value"), item.get("ref_low"), item.get("ref_high"))


async def latest_values(user_id: str) -> Dict[str, dict]:
    """The most recent confirmed value per biomarker, with its range status."""
    latest: Dict[str, dict] = {}
    for item in await model.list_biomarkers(user_id):
        current = latest.get(item["code"])
        if current is None or item["measured_at"] >= current["measured_at"]:
            latest[item["code"]] = {**item, "status": _status_of(item)}
    return latest


async def history(user_id: str) -> List[dict]:
    """Confirmed values grouped per biomarker, oldest first, for charts."""
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    groups: Dict[str, dict] = {}
    for item in await model.list_biomarkers(user_id):
        code = item["code"]
        if code not in groups:
            info = bm.describe(code) if code in bm.BIOMARKERS else {
                "code": code, "name": item["name"], "unit": item["unit"], "category": "other",
                "about": None, "source": None,
            }
            groups[code] = {**info, "points": []}
        groups[code]["points"].append({
            "id": item["id"],
            "date": item["measured_at"],
            "value": item["value"],
            "unit": item["unit"],
            "ref_low": item.get("ref_low"),
            "ref_high": item.get("ref_high"),
            "ref_source": item.get("ref_source"),
            "status": _status_of(item),
            "source": item.get("source"),
            "report_id": item.get("report_id"),
        })
    result = []
    for group in groups.values():
        group["points"].sort(key=lambda p: p["date"])
        latest = group["points"][-1]
        group["latest"] = latest
        group["reference"] = {"low": latest["ref_low"], "high": latest["ref_high"], "source": latest["ref_source"]}
        result.append(group)
    result.sort(key=lambda g: (g["latest"]["status"] not in ("low", "high"), g["name"]))
    return result


def catalogue() -> List[dict]:
    """Biomarkers the app knows (for manual entry)."""
    return [{**bm.describe(code), "reference": bm.reference(code, None)} for code in bm.BIOMARKERS]
