from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.friend import FriendRequestCreate
from app.schemas.general import SuccessResponse
from app.services import friend_service
from app.services.friend_service import FriendServiceError

router = APIRouter(prefix="/friends", tags=["Friends"])
leaderboard_router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.post("/request", response_model=SuccessResponse)
async def send_friend_request(
    payload: FriendRequestCreate, current_user: User = Depends(get_current_user)
) -> dict:
    """Send a friend request by user id or username."""
    to_user_id = payload.to_user_id
    if to_user_id is None and payload.to_username:
        target = await User.get_by_username(payload.to_username)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        to_user_id = target.id
    try:
        friendship = await friend_service.send_friend_request(current_user.id, to_user_id)
    except FriendServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "success": True,
        "message": "Friend request sent",
        "data": {"request_id": friendship.id, "status": friendship.status},
    }


@router.put("/accept/{request_id}", response_model=SuccessResponse)
async def accept_friend_request(
    request_id: str, current_user: User = Depends(get_current_user)
) -> dict:
    """Accept a pending friend request addressed to the current user."""
    try:
        friendship = await friend_service.accept_friend_request(current_user.id, request_id)
    except FriendServiceError as exc:
        code = (
            status.HTTP_404_NOT_FOUND
            if "not found" in str(exc).lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=code, detail=str(exc)) from exc
    return {
        "success": True,
        "message": "Friend request accepted",
        "data": {"friend_id": friendship.requester_id, "status": friendship.status},
    }


@router.get("/list", response_model=SuccessResponse)
async def get_friends_list(current_user: User = Depends(get_current_user)) -> dict:
    """Return the current user's accepted friends."""
    friends = await friend_service.get_friends_list(current_user.id)
    return {
        "success": True,
        "message": "Friends retrieved",
        "data": {"friends": friends},
    }


@router.post("/nudge/{user_id}", response_model=SuccessResponse)
async def send_nudge(
    user_id: str, current_user: User = Depends(get_current_user)
) -> dict:
    """Send a workout nudge to a friend."""
    try:
        await friend_service.send_nudge(current_user.id, user_id)
    except FriendServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True, "message": "Nudge sent", "data": None}


@router.get("/{username}", response_model=SuccessResponse)
async def search_user(
    username: str, current_user: User = Depends(get_current_user)
) -> dict:
    """Search for a user by username (includes friendship status)."""
    try:
        result = await friend_service.search_user(username, current_user.id)
    except FriendServiceError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"success": True, "message": "User found", "data": result}


@leaderboard_router.get("/weekly", response_model=SuccessResponse)
async def get_weekly_leaderboard(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the weekly XP leaderboard of the user and their friends."""
    leaderboard = await friend_service.get_leaderboard(current_user.id)
    return {
        "success": True,
        "message": "Leaderboard retrieved",
        "data": {"leaderboard": leaderboard},
    }
