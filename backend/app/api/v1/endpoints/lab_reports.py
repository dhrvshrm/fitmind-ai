"""Lab reports ("health reports") and biomarker history.

Separate from /reports, which are the weekly progress reports.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.api.v1.endpoints.auth import get_current_user
from app.api.v1.endpoints.health_profile import consent_http, crypto_http
from app.health.crypto import HealthCryptoError
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.schemas.health import BiomarkerValueIn, ConfirmReportRequest
from app.services import lab_report_service
from app.services.consent_service import ConsentRequired
from app.services.lab_report_service import MAX_FILE_BYTES, LabReportError

router = APIRouter(tags=["Lab reports"])

_STATUS = {
    "not_found": status.HTTP_404_NOT_FOUND,
    "invalid": status.HTTP_400_BAD_REQUEST,
    "unavailable": status.HTTP_503_SERVICE_UNAVAILABLE,
}


def _http(exc: Exception) -> HTTPException:
    if isinstance(exc, ConsentRequired):
        return consent_http(exc)
    if isinstance(exc, HealthCryptoError):
        return crypto_http(exc)
    kind = getattr(exc, "kind", "invalid")
    return HTTPException(status_code=_STATUS.get(kind, status.HTTP_400_BAD_REQUEST), detail=str(exc))


_ERRORS = (ConsentRequired, LabReportError, HealthCryptoError)


@router.post("/lab-reports", response_model=SuccessResponse)
async def upload_lab_report(
    file: UploadFile = File(...),
    allow_ai: bool = Form(True),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Upload a lab report (PDF or photo, up to 10 MB) and get DRAFT values to review.

    Values are read on the server first; when ``allow_ai`` is true, Gemini reads
    what that missed. Nothing is added to biomarker history until confirmed.
    """
    content = await file.read(MAX_FILE_BYTES + 1)
    try:
        report = await lab_report_service.upload(
            current_user.id, content, file.filename or "report", file.content_type, allow_ai
        )
    except _ERRORS as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Report uploaded. Please check the values", "data": report}


@router.get("/lab-reports", response_model=SuccessResponse)
async def list_lab_reports(current_user: User = Depends(get_current_user)) -> dict:
    try:
        reports = await lab_report_service.list_reports(current_user.id)
    except _ERRORS as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Lab reports", "data": reports}


@router.get("/lab-reports/{report_id}", response_model=SuccessResponse)
async def get_lab_report(report_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """One report with its draft values (while it still needs review)."""
    try:
        report = await lab_report_service.get_report(current_user.id, report_id)
    except _ERRORS as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Lab report", "data": report}


@router.get("/lab-reports/{report_id}/file-link", response_model=SuccessResponse)
async def lab_report_file_link(report_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """A short-lived signed URL for the original file, or ``url: null`` when it's
    served by ``GET /lab-reports/{id}/file`` instead (development storage)."""
    try:
        link = await lab_report_service.file_link(current_user.id, report_id)
    except _ERRORS as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "File link", "data": link}


@router.get("/lab-reports/{report_id}/file")
async def lab_report_file(report_id: str, current_user: User = Depends(get_current_user)) -> Response:
    """The original file (development storage only; R2 files use signed URLs)."""
    try:
        content, mime = await lab_report_service.file_content(current_user.id, report_id)
    except _ERRORS as exc:
        raise _http(exc) from exc
    return Response(content=content, media_type=mime,
                    headers={"Cache-Control": "no-store", "Content-Disposition": "inline"})


@router.post("/lab-reports/{report_id}/confirm", response_model=SuccessResponse)
async def confirm_lab_report(
    report_id: str, payload: ConfirmReportRequest, current_user: User = Depends(get_current_user)
) -> dict:
    """Save the values the user checked. Only these become biomarker history."""
    values = [v.model_dump() for v in payload.values]
    date_text = payload.report_date.isoformat() if payload.report_date else None
    try:
        result = await lab_report_service.confirm(current_user.id, report_id, date_text, values)
    except _ERRORS as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Values saved", "data": result}


@router.delete("/lab-reports/{report_id}", response_model=SuccessResponse)
async def delete_lab_report(report_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Delete a report, its file, and the values saved from it."""
    try:
        await lab_report_service.delete_report(current_user.id, report_id)
    except _ERRORS as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Report deleted", "data": None}


@router.get("/biomarkers", response_model=SuccessResponse)
async def biomarker_history(current_user: User = Depends(get_current_user)) -> dict:
    """Confirmed values grouped per biomarker, with usual ranges, for charts."""
    try:
        groups = await lab_report_service.history(current_user.id)
    except _ERRORS as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Biomarkers", "data": groups}


@router.get("/biomarkers/catalog", response_model=SuccessResponse)
async def biomarker_catalog(_current_user: User = Depends(get_current_user)) -> dict:
    """Biomarkers the app recognises, with units and usual adult ranges."""
    return {"success": True, "message": "Biomarker catalogue", "data": lab_report_service.catalogue()}


@router.post("/biomarkers", response_model=SuccessResponse)
async def add_biomarker(payload: BiomarkerValueIn, current_user: User = Depends(get_current_user)) -> dict:
    """Add a value by hand (for results without an uploaded report)."""
    try:
        value = await lab_report_service.add_manual_value(current_user.id, payload.model_dump())
    except _ERRORS as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Value saved", "data": value}


@router.delete("/biomarkers/{biomarker_id}", response_model=SuccessResponse)
async def delete_biomarker(biomarker_id: str, current_user: User = Depends(get_current_user)) -> dict:
    try:
        await lab_report_service.delete_value(current_user.id, biomarker_id)
    except _ERRORS as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Value deleted", "data": None}
