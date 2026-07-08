from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.general import SuccessResponse
from app.schemas.user import UserLogin, UserRegister
from app.models.user import User
from app.services import auth_service
from app.services.auth_service import AuthError

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Extracts the "Authorization: Bearer <token>" header on protected routes.
bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    """FastAPI dependency that resolves the authenticated user from a JWT.

    Raises:
        HTTPException: 401 if the token is missing, invalid, or expired.
    """
    try:
        return await auth_service.get_user_from_token(credentials.credentials)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


@router.post("/register", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister) -> dict:
    """Register a new user."""
    try:
        user = await auth_service.register_user(payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return {
        "success": True,
        "message": "User registered successfully",
        "data": {"user_id": user.id, "email": user.email},
    }


@router.post("/login", response_model=SuccessResponse)
async def login(payload: UserLogin) -> dict:
    """Authenticate a user and return a JWT access token."""
    try:
        token = await auth_service.login_user(payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    return {
        "success": True,
        "message": "Login successful",
        "data": {"token": token},
    }


@router.get("/me", response_model=SuccessResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> dict:
    """Return the currently authenticated user (requires a valid JWT)."""
    return {
        "success": True,
        "message": "User data retrieved",
        "data": current_user.public_dict(),
    }


@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: User = Depends(get_current_user)) -> dict:
    """Log the user out.

    JWTs are stateless, so logout is handled client-side by discarding the
    token; this endpoint confirms the token was valid.
    """
    return {
        "success": True,
        "message": "Logout successful",
        "data": None,
    }
