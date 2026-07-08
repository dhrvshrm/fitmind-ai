import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.config.settings import get_settings
from app.models.user import User

logger = logging.getLogger(__name__)

# Access-token lifetime in minutes.
TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


class AuthError(Exception):
    """Raised for authentication failures (bad credentials, duplicate email)."""


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt and return it as a UTF-8 string."""
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Return ``True`` if ``password`` matches the bcrypt ``hashed`` value."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------
def create_jwt_token(user_id: str, email: str) -> str:
    """Create a signed JWT containing the user id (``sub``) and email."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_jwt_token(token: str) -> dict:
    """Decode and validate a JWT, returning its claims.

    Raises:
        AuthError: if the token is invalid, expired, or malformed.
    """
    settings = get_settings()
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as exc:
        raise AuthError("Invalid or expired token") from exc


# ---------------------------------------------------------------------------
# Optional Supabase Auth integration
# ---------------------------------------------------------------------------
def _get_supabase_client():
    """Return a configured Supabase client, or ``None`` when unavailable.

    Supabase is optional: it activates only when both credentials are set and
    the ``supabase`` package is installed. Otherwise the local bcrypt + JWT
    path is used, keeping the app runnable without external services.
    """
    settings = get_settings()
    if not (settings.SUPABASE_URL and settings.SUPABASE_SECRET_KEY):
        return None
    try:
        from supabase import create_client
    except ImportError:
        logger.warning("Supabase configured but 'supabase' package not installed")
        return None
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)


# ---------------------------------------------------------------------------
# Registration / login
# ---------------------------------------------------------------------------
async def register_user(email: str, password: str) -> User:
    """Register a new user and persist it.

    Uses Supabase Auth when configured; otherwise stores a bcrypt-hashed
    password locally.

    Raises:
        AuthError: if a user with the given email already exists.
    """
    existing = await User.get_by_email(email)
    if existing is not None:
        raise AuthError("A user with this email already exists")

    supabase = _get_supabase_client()
    if supabase is not None:
        supabase.auth.sign_up({"email": email, "password": password})

    user = User(email=email, password_hash=hash_password(password))
    await user.save()
    logger.info("Registered new user %s", email)
    return user


async def login_user(email: str, password: str) -> str:
    """Authenticate a user and return a signed JWT access token.

    Raises:
        AuthError: if the email is unknown or the password is incorrect.
    """
    user = await User.get_by_email(email)
    if user is None or not verify_password(password, user.password_hash):
        raise AuthError("Invalid email or password")
    return create_jwt_token(user.id, user.email)


async def get_user_from_token(token: str) -> User:
    """Resolve the ``User`` referenced by a valid JWT.

    Raises:
        AuthError: if the token is invalid or the user no longer exists.
    """
    claims = verify_jwt_token(token)
    user_id: Optional[str] = claims.get("sub")
    user = await User.get_by_id(user_id) if user_id else None
    if user is None:
        raise AuthError("User not found")
    return user
