from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.coach import CoachMessageRequest
from app.schemas.general import SuccessResponse
from app.services import chat_service
from app.services.chat_service import CoachError
from app.websockets.handlers import invalidate_handler

router = APIRouter(prefix="/coach", tags=["Coach"])

MAX_MENU_IMAGE_BYTES = 6 * 1024 * 1024
MENU_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

_STATUS = {
    "not_found": status.HTTP_404_NOT_FOUND,
    "conflict": status.HTTP_409_CONFLICT,
    "quota": status.HTTP_429_TOO_MANY_REQUESTS,
}


def _http(exc: CoachError) -> HTTPException:
    return HTTPException(status_code=_STATUS.get(exc.code, status.HTTP_400_BAD_REQUEST), detail=str(exc))


@router.get("/conversation", response_model=SuccessResponse)
async def get_conversation(current_user: User = Depends(get_current_user)) -> dict:
    """The active coach conversation and its latest messages, with any confirm cards."""
    data = await chat_service.get_conversation(current_user.id)
    return {"success": True, "message": "Conversation loaded", "data": data}


@router.post("/conversation", response_model=SuccessResponse)
async def new_conversation(current_user: User = Depends(get_current_user)) -> dict:
    """Start a new chat. Older chats beyond the last few are deleted."""
    data = await chat_service.new_conversation(current_user.id)
    return {"success": True, "message": "New chat started", "data": data}


@router.delete("/history", response_model=SuccessResponse)
async def clear_history(current_user: User = Depends(get_current_user)) -> dict:
    """Delete every coach conversation, message and pending action."""
    await chat_service.clear_history(current_user.id)
    return {"success": True, "message": "Coach history cleared", "data": None}


@router.post("/messages", response_model=SuccessResponse)
async def send_message(payload: CoachMessageRequest, current_user: User = Depends(get_current_user)) -> dict:
    """Send a message and get the whole reply (the WebSocket streams the same thing)."""
    data = await chat_service.reply_once(current_user.id, payload.content)
    return {"success": True, "message": "Reply ready", "data": data}


@router.post("/actions/{proposal_id}/confirm", response_model=SuccessResponse)
async def confirm_action(proposal_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Run a proposed action. The confirmation text comes from the backend result.

    ``data.proposal.status`` is ``done`` or ``failed``; ``data.invalidate``
    lists the data domains the app should refresh.
    """
    try:
        data = await chat_service.confirm_action(current_user.id, proposal_id)
    except CoachError as exc:
        raise _http(exc) from exc
    await invalidate_handler(current_user.id, data["invalidate"])
    done = data["proposal"]["status"] == "done"
    return {"success": True, "message": data["message"]["content"] if done else "Action failed", "data": data}


@router.post("/actions/{proposal_id}/cancel", response_model=SuccessResponse)
async def cancel_action(proposal_id: str, current_user: User = Depends(get_current_user)) -> dict:
    """Dismiss a proposed action without running it."""
    try:
        data = await chat_service.cancel_action(current_user.id, proposal_id)
    except CoachError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Action dismissed", "data": data}


@router.post("/menu", response_model=SuccessResponse)
async def menu_advice(
    text: Optional[str] = Form(None, max_length=6000),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
) -> dict:
    """"What should I order?": best 2-3 dishes from a menu (text and/or photo).

    Numbers are estimates from the food database pipeline, each with a
    one-tap "log this" card. The exchange is saved in the coach chat.
    """
    data_bytes: Optional[bytes] = None
    mime: Optional[str] = None
    if image is not None and image.filename:
        mime = (image.content_type or "").lower()
        if mime not in MENU_IMAGE_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a JPG, PNG or WebP photo")
        data_bytes = await image.read(MAX_MENU_IMAGE_BYTES + 1)
        if len(data_bytes) > MAX_MENU_IMAGE_BYTES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That photo is too large (6 MB max)")
    try:
        data = await chat_service.menu_advice(current_user.id, text, data_bytes, mime)
    except CoachError as exc:
        raise _http(exc) from exc
    return {"success": True, "message": "Menu suggestions ready", "data": data}
