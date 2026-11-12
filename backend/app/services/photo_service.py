"""Private progress photos.

Photos go to private Cloudflare R2 storage and are only ever shown through
short-lived signed URLs; there are no public links. Without R2 configured the
feature reports itself as unavailable instead of storing images anywhere
else. Photos are removed with the account (``progress_photos/{user_id}/``).
"""
import logging
from datetime import date, timedelta
from typing import Any, Dict, Optional, Tuple
from uuid import uuid4

from app.models import progress as store
from app.services import cloud_service
from app.services.progress_service import ProgressServiceError
from app.utils.time import local_today

logger = logging.getLogger(__name__)

MAX_PHOTO_BYTES = 5 * 1024 * 1024
SIGNED_URL_SECONDS = 600
MAX_PHOTO_AGE_DAYS = 365
KEY_PREFIX = "progress_photos/{user_id}/"


def _sniff(data: bytes) -> Optional[Tuple[str, str]]:
    """(content type, extension) from the file's first bytes, or None if not a supported image."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", "jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None


def is_available() -> bool:
    return cloud_service.is_private_storage_configured()


async def list_photos(user_id: str) -> Dict[str, Any]:
    """The user's photos, newest first, each with a short-lived signed URL."""
    if not is_available():
        return {"available": False, "photos": []}
    photos = []
    for doc in await store.list_photos(user_id):
        photos.append({
            "id": doc["id"],
            "date": doc["log_date"],
            "url": await cloud_service.signed_url(doc["key"], SIGNED_URL_SECONDS),
        })
    return {"available": True, "photos": photos, "url_expires_in": SIGNED_URL_SECONDS}


async def upload_photo(user_id: str, data: bytes, photo_date: Optional[date] = None) -> Dict[str, Any]:
    """Store a progress photo privately. JPEG, PNG or WebP, up to 5 MB."""
    if not is_available():
        raise ProgressServiceError("Progress photos aren't available right now", 503)
    if not data:
        raise ProgressServiceError("The photo was empty")
    if len(data) > MAX_PHOTO_BYTES:
        raise ProgressServiceError("That photo is too large. Please keep it under 5 MB.", 413)
    kind = _sniff(data)
    if kind is None:
        raise ProgressServiceError("Please upload a JPEG, PNG or WebP photo", 415)
    today = local_today()
    day = photo_date or today
    if day > today or day < today - timedelta(days=MAX_PHOTO_AGE_DAYS):
        raise ProgressServiceError("Pick a date within the last year")
    content_type, ext = kind
    key = f"{KEY_PREFIX.format(user_id=user_id)}{uuid4().hex}.{ext}"
    if not await cloud_service.upload_private(key, data, content_type):
        raise ProgressServiceError("We couldn't save the photo. Please try again.", 502)
    doc = await store.add_photo(user_id, key, day.isoformat(), content_type, len(data))
    return {"id": doc["id"], "date": doc["log_date"], "url": await cloud_service.signed_url(key, SIGNED_URL_SECONDS)}


async def delete_photo(user_id: str, photo_id: str) -> None:
    """Delete a photo and its stored image."""
    doc = await store.get_photo(user_id, photo_id)
    if doc is None:
        raise ProgressServiceError("Photo not found", 404)
    await cloud_service.delete_private(doc["key"])
    await store.delete_photo(user_id, photo_id)
