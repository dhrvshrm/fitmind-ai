"""Field-level encryption for health data at rest.

Health profile answers, medications and lab values are encrypted with Fernet
(AES-128-CBC + HMAC-SHA256, from the ``cryptography`` package) using the
``HEALTH_DATA_KEY`` setting. Encrypted values are stored as strings prefixed
with ``enc:v1:`` so plaintext written during development can still be read.

Without a key:
- in development and tests values are stored as plaintext and a warning is
  logged once, so the app works out of the box;
- staging and production still start (``Settings.validate_for_production`` only
  warns), but storing or reading health data raises ``HealthCryptoError`` (503).
"""
import json
import logging
from typing import Any, Optional

from cryptography.fernet import Fernet, InvalidToken

from app.config.settings import get_settings

logger = logging.getLogger(__name__)

PREFIX = "enc:v1:"
_warned = False


class HealthCryptoError(Exception):
    """Raised when health data can't be encrypted or decrypted."""


def _fernet() -> Optional[Fernet]:
    """The configured Fernet, or None when no key is set (development only)."""
    global _warned
    key = get_settings().HEALTH_DATA_KEY.strip()
    if not key:
        if get_settings().is_production:
            raise HealthCryptoError("HEALTH_DATA_KEY is required to store health data")
        if not _warned:
            logger.warning("HEALTH_DATA_KEY is not set: health data is stored unencrypted (development only)")
            _warned = True
        return None
    try:
        return Fernet(key.encode())
    except (ValueError, TypeError) as e:
        raise HealthCryptoError("HEALTH_DATA_KEY is not a valid Fernet key") from e


def is_enabled() -> bool:
    """True when health data is being encrypted."""
    return _fernet() is not None


def encrypt(value: Any) -> Any:
    """Encrypt any JSON-serialisable value. Returns it unchanged without a key."""
    if value is None:
        return None
    fernet = _fernet()
    if fernet is None:
        return value
    raw = json.dumps(value, default=str, separators=(",", ":")).encode()
    return PREFIX + fernet.encrypt(raw).decode()


def decrypt(stored: Any) -> Any:
    """Reverse :func:`encrypt`. Plaintext values (from development) pass through."""
    if not (isinstance(stored, str) and stored.startswith(PREFIX)):
        return stored
    fernet = _fernet()
    if fernet is None:
        raise HealthCryptoError("Encrypted health data found but HEALTH_DATA_KEY is not set")
    try:
        return json.loads(fernet.decrypt(stored[len(PREFIX):].encode()))
    except InvalidToken as e:
        raise HealthCryptoError("Health data could not be decrypted with this key") from e


def encrypt_bytes(data: bytes) -> bytes:
    """Encrypt a file's bytes (unchanged without a key)."""
    fernet = _fernet()
    return fernet.encrypt(data) if fernet else data


def decrypt_bytes(data: bytes, encrypted: bool) -> bytes:
    """Reverse :func:`encrypt_bytes`; ``encrypted`` says whether it was applied."""
    if not encrypted:
        return data
    fernet = _fernet()
    if fernet is None:
        raise HealthCryptoError("Encrypted file found but HEALTH_DATA_KEY is not set")
    try:
        return fernet.decrypt(data)
    except InvalidToken as e:
        raise HealthCryptoError("File could not be decrypted with this key") from e
