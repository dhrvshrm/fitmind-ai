from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/history", response_model=SuccessResponse)
async def get_report_history(current_user: User = Depends(get_current_user)) -> dict:
    """Return all of the user's past weekly reports (newest first)."""
    reports = await report_service.get_report_history(current_user.id)
    return {
        "success": True,
        "message": "Report history retrieved",
        "data": {"reports": [r.public_dict() for r in reports]},
    }


@router.get("/latest", response_model=SuccessResponse)
async def get_latest_report(current_user: User = Depends(get_current_user)) -> dict:
    """Return the user's most recent weekly report."""
    report = await report_service.get_latest_report(current_user.id)
    return {
        "success": True,
        "message": "Latest report retrieved",
        "data": {"report": report.public_dict() if report else None},
    }


@router.post("/generate", response_model=SuccessResponse)
async def generate_report(current_user: User = Depends(get_current_user)) -> dict:
    """Generate a weekly report on demand for the current user."""
    report = await report_service.generate_weekly_report(current_user.id)
    return {
        "success": True,
        "message": "Weekly report generated",
        "data": {"report": report.public_dict()},
    }


@router.get("/{report_id}", response_model=SuccessResponse)
async def get_report(
    report_id: str, current_user: User = Depends(get_current_user)
) -> dict:
    """Return a single report by id (must belong to the current user)."""
    report = await report_service.get_report(report_id)
    if report is None or report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )
    return {
        "success": True,
        "message": "Report retrieved",
        "data": {"report": report.public_dict()},
    }
