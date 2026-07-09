import logging
from typing import Optional

import certifi

from app.config.settings import get_settings

logger = logging.getLogger(__name__)

db_client = None
db = None


async def connect_to_mongo() -> None:
    """Connect to MongoDB on startup.

    Failures are logged but not raised so the app can boot even when the
    database is unreachable. On any failure ``db_client``/``db`` are reset to
    ``None`` so :func:`get_database` reports "no database" and callers fall
    back to the in-memory store instead of hanging on a dead connection.
    """
    global db_client, db

    settings = get_settings()
    try:
        from motor.motor_asyncio import AsyncIOMotorClient

        # Atlas (mongodb+srv) uses TLS and needs a CA bundle; a plain local
        # mongodb:// connection is non-TLS, so tlsCAFile must NOT be passed
        # there or it forces TLS and the handshake fails.
        options: dict = {"serverSelectionTimeoutMS": 5000}
        if settings.MONGODB_URL.startswith("mongodb+srv://") or "tls=true" in settings.MONGODB_URL.lower():
            options["tlsCAFile"] = certifi.where()

        client = AsyncIOMotorClient(settings.MONGODB_URL, **options)
        # Verify connectivity BEFORE exposing the handles globally.
        await client.admin.command("ping")
        db_client = client
        db = client[settings.DATABASE_NAME]
        logger.info("Connected to MongoDB")
    except Exception as e:
        db_client = None
        db = None
        logger.warning(f"MongoDB unavailable — using in-memory fallback: {e}")


async def close_mongo_connection() -> None:
    """Close the MongoDB connection on shutdown."""
    global db_client
    if db_client:
        db_client.close()
        logger.info("Closed MongoDB connection")


def get_database() -> Optional[object]:
    """Dependency-injection provider returning the active database handle.

    Returns None until :func:`connect_to_mongo` establishes a connection.
    """
    return db
