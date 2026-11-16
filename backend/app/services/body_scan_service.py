"""Body composition scans: reading a printout, saving what the user checked,
history with what changed, and the training focus the workout planner uses.

Uploads go through lab_report_service (same consent, private file storage
and review step); this module handles what is specific to scans. Like lab
values, nothing becomes history until the user confirms it.
"""
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.ai import client as ai_client
from app.ai.client import AIError
from app.health import body_composition as bc
from app.health import extraction
from app.models import audit
from app.models import lab_report as model
from app.models.user import User
from app.services import consent_service
from app.services.consent_service import SCOPE_HEALTH_REPORTS
from app.utils.time import local_today, local_today_iso

logger = logging.getLogger(__name__)

# A scan this recent also updates the profile weight (older ones only body fat).
PROFILE_WEIGHT_DAYS = 14
# Fewer printed fields than this from a text PDF means AI may read more.
LOCAL_ENOUGH = 4
MAX_AI_TEXT_CHARS = 12000


class BodyScanError(Exception):
    def __init__(self, message: str, kind: str = "invalid"):
        super().__init__(message)
        self.kind = kind


async def extract(user_id: str, content: bytes, mime_type: str, allow_ai: bool) -> Dict[str, Any]:
    """A draft scan from a printout: printed labels first, AI for the rest (if allowed).

    Returns ``{"scan", "report_date", "methods", "ai_error"}``.
    """
    text = extraction.pdf_text(content) if mime_type == "application/pdf" else ""
    scan = bc.extract_local(text) if text else {"segments": {}}
    report_date = extraction.find_report_date(text) if text else None
    methods = ["local"] if text else []
    ai_error = None
    printed = len([k for k in scan if k != "segments"])
    if allow_ai and (printed < LOCAL_ENOUGH or not scan.get("segments")):
        try:
            if text.strip():
                result = await ai_client.generate_json(
                    f"{bc.AI_PROMPT}\n\nSheet text:\n{text[:MAX_AI_TEXT_CHARS]}", bc.AIBodyScan,
                    system=bc.AI_SYSTEM, temperature=0.0, user_id=user_id,
                )
            else:
                result = await ai_client.generate_json_from_image(
                    bc.AI_PROMPT, content, mime_type, bc.AIBodyScan, system=bc.AI_SYSTEM, user_id=user_id,
                )
            read = bc.sanitize(result.as_raw())
            # Printed labels win; AI fills what they missed, including the segments.
            scan = {**read, **{k: v for k, v in scan.items() if k != "segments"},
                    "segments": scan.get("segments") or read.get("segments", {})}
            report_date = report_date or extraction._parse_date(result.measured_at or "")
            methods.append("ai")
        except AIError as e:
            logger.info("AI body scan reading unavailable for %s: %s", user_id, e)
            ai_error = "unavailable"
    return {"scan": scan, "report_date": report_date, "methods": methods, "ai_error": ai_error}


async def _sex(user_id: str) -> Optional[str]:
    user = await User.get_by_id(user_id)
    return user.gender if user else None


def _scan_of(doc: dict) -> bc.BodyScan:
    return bc.BodyScan(**{k: v for k, v in doc.items() if k in bc.BodyScan.model_fields})


async def _update_profile(user_id: str, scan: bc.BodyScan) -> List[str]:
    """Put the newest scan's body fat (and recent weight) in the profile, so targets use lean mass."""
    from app.services import user_service

    updates: Dict[str, Any] = {}
    if scan.body_fat_percent is not None:
        updates["body_fat_percent"] = round(scan.body_fat_percent, 1)
    measured = date.fromisoformat(scan.measured_at) if scan.measured_at else local_today()
    if scan.weight_kg is not None and (local_today() - measured) <= timedelta(days=PROFILE_WEIGHT_DAYS):
        updates["weight_kg"] = round(scan.weight_kg, 1)
    if updates:
        await user_service.update_user_profile(user_id, updates)
    return sorted(updates)


async def _save(user_id: str, scan: bc.BodyScan, report_id: Optional[str], use_for_profile: bool) -> dict:
    if not scan.has_values():
        raise BodyScanError("Add at least your weight, muscle mass, body fat or a body segment")
    measured_at = scan.measured_at or local_today_iso()
    scan = scan.model_copy(update={"measured_at": measured_at})
    doc = await model.add_scan({
        **scan.model_dump(),
        "id": str(uuid4()),
        "user_id": user_id,
        "report_id": report_id,
        "source": "report" if report_id else "manual",
        "created_at": datetime.now(timezone.utc),
    })
    updated: List[str] = []
    newest = max((s["measured_at"] for s in await model.list_scans(user_id)), default=measured_at)
    if use_for_profile and measured_at >= newest:
        updated = await _update_profile(user_id, scan)
    await audit.record_change(user_id, "body_scan", "add", after={"source": doc["source"]}, entity_id=doc["id"])
    return {"scan": await _present_one(user_id, doc["id"]), "profile_updated": updated}


async def confirm(user_id: str, report_id: str, scan: bc.BodyScan, use_for_profile: bool) -> dict:
    """Save the scan values the user checked from an uploaded printout.

    Raises:
        BodyScanError: when the report isn't a waiting body scan, or nothing was filled in.
    """
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    report = await model.get_report(user_id, report_id)
    if report is None or report.get("kind") != "body_composition":
        raise BodyScanError("Scan not found", "not_found")
    if report["status"] == model.STATUS_CONFIRMED:
        raise BodyScanError("This scan is already saved. Delete it to start again")
    scan = scan.model_copy(update={"measured_at": scan.measured_at or report.get("report_date")})
    result = await _save(user_id, scan, report_id, use_for_profile)
    private = {k: report.get(k) for k in ("filename", "lab")}
    private.update({"report_date": scan.measured_at, "scan_draft": None})
    await model.update_report(user_id, report_id, {
        "status": model.STATUS_CONFIRMED, "confirmed_at": datetime.now(timezone.utc), "confirmed_count": 1,
    }, private)
    return result


async def add_manual(user_id: str, scan: bc.BodyScan, use_for_profile: bool) -> dict:
    """A scan typed in from a printout the user has but didn't upload."""
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    return await _save(user_id, scan, None, use_for_profile)


def _present(doc: dict, previous: Optional[dict], sex: Optional[str]) -> dict:
    scan = _scan_of(doc)
    return {
        **scan.model_dump(),
        "id": doc["id"],
        "report_id": doc.get("report_id"),
        "source": doc.get("source"),
        "analysis": bc.analyse(scan, sex),
        "changes": bc.changes(scan, _scan_of(previous) if previous else None),
    }


async def list_scans(user_id: str) -> List[dict]:
    """Every scan, newest first, each with its analysis and what changed since the one before."""
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    docs = await model.list_scans(user_id)
    sex = await _sex(user_id)
    out = [_present(doc, docs[i - 1] if i else None, sex) for i, doc in enumerate(docs)]
    return list(reversed(out))


async def _present_one(user_id: str, scan_id: str) -> dict:
    docs = await model.list_scans(user_id)
    sex = await _sex(user_id)
    for i, doc in enumerate(docs):
        if doc["id"] == scan_id:
            return _present(doc, docs[i - 1] if i else None, sex)
    raise BodyScanError("Scan not found", "not_found")


async def delete_scan(user_id: str, scan_id: str) -> None:
    await consent_service.require(user_id, SCOPE_HEALTH_REPORTS)
    if not await model.delete_scan(user_id, scan_id):
        raise BodyScanError("Scan not found", "not_found")
    await audit.record_change(user_id, "body_scan", "delete", before={"exists": True}, after={}, entity_id=scan_id)


async def latest(user_id: str) -> Optional[dict]:
    """The newest scan with its analysis, or None (also without report consent)."""
    if not await consent_service.has_consent(user_id, SCOPE_HEALTH_REPORTS):
        return None
    docs = await model.list_scans(user_id)
    if not docs:
        return None
    return _present(docs[-1], docs[-2] if len(docs) > 1 else None, await _sex(user_id))


async def latest_training(user_id: str) -> Optional[dict]:
    """The workout planner's focus from the newest scan, or None."""
    scan = await latest(user_id)
    if scan is None:
        return None
    return {**scan["analysis"]["training"], "scan_id": scan["id"], "measured_at": scan["measured_at"]}
