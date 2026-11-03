import asyncio
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


def _r2_client():
    """Return a boto3 S3 client for R2, or ``None`` when R2 is unavailable."""
    if not _is_r2_configured():
        return None
    try:
        import boto3  # Soft import: only needed when R2 is actually used.
    except ImportError:
        logger.warning("R2 configured but 'boto3' is not installed")
        return None
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.CLOUDFLARE_R2_URL,
        aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY,
        aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_KEY,
        region_name="auto",
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
    development. The blocking boto3 call runs in a worker thread so it
    doesn't stall the event loop.
    """
    client = _r2_client()
    if client is None:
        logger.info("R2 not configured - skipping audio upload")
        return None

    settings = get_settings()
    key = f"voice/{user_id}/{uuid4().hex}.{extension}"
    try:
        await asyncio.to_thread(
            client.put_object,
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


# Every R2 prefix that holds a user's files, for account deletion.
USER_FILE_PREFIXES = ("voice/{user_id}/",)


def _delete_prefix(client, bucket: str, prefix: str) -> int:
    """Delete every object under ``prefix`` and return how many were removed."""
    deleted = 0
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        keys = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
        if keys:
            client.delete_objects(Bucket=bucket, Delete={"Objects": keys})
            deleted += len(keys)
    return deleted


async def delete_user_files(user_id: str) -> int:
    """Delete all of a user's stored files from R2. Returns the count removed."""
    client = _r2_client()
    if client is None:
        return 0
    bucket = get_settings().CLOUDFLARE_R2_BUCKET
    total = 0
    for template in USER_FILE_PREFIXES:
        total += await asyncio.to_thread(
            _delete_prefix, client, bucket, template.format(user_id=user_id)
        )
    logger.info("Deleted %d R2 object(s) for user %s", total, user_id)
    return total
