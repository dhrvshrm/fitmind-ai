import logging
from typing import Optional
from uuid import uuid4

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


def _is_r2_configured() -> bool:
    """Return True when enough Cloudflare R2 settings are present to upload.

    A real S3-compatible upload needs an endpoint, access key, secret and
    bucket. Until those are configured, uploads are skipped gracefully.
    """
    s = get_settings()
    return bool(
        s.CLOUDFLARE_R2_URL
        and s.CLOUDFLARE_R2_ACCESS_KEY
        and s.CLOUDFLARE_R2_SECRET_KEY
        and s.CLOUDFLARE_R2_BUCKET
    )


async def upload_to_r2(
    file_bytes: bytes,
    user_id: str,
    content_type: str = "audio/webm",
    extension: str = "webm",
) -> Optional[str]:
    """Upload a file to Cloudflare R2 and return its public URL.

    Returns ``None`` when R2 is not configured or the ``boto3`` client is
    unavailable, so callers can proceed without object storage during
    development. Real uploads activate once R2 credentials are set.
    """
    if not _is_r2_configured():
        logger.info("R2 not configured - skipping audio upload")
        return None

    try:
        import boto3  # Soft import: only needed when R2 is actually used.
    except ImportError:
        logger.warning("R2 configured but 'boto3' is not installed - skipping upload")
        return None

    settings = get_settings()
    key = f"voice/{user_id}/{uuid4().hex}.{extension}"
    try:
        client = boto3.client(
            "s3",
            endpoint_url=settings.CLOUDFLARE_R2_URL,
            aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY,
            aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_KEY,
            region_name="auto",
        )
        client.put_object(
            Bucket=settings.CLOUDFLARE_R2_BUCKET,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except Exception as e:  # Storage must never break the check-in flow.
        logger.warning("R2 upload failed: %s", e)
        return None

    base = settings.CLOUDFLARE_R2_PUBLIC_URL or settings.CLOUDFLARE_R2_URL
    url = f"{base.rstrip('/')}/{key}"
    logger.info("Uploaded audio to R2: %s", url)
    return url
