import logging
from typing import Optional

from app.config.settings import get_settings

logger = logging.getLogger(__name__)

db_client = None
db = None


async def connect_to_mongo() -> None:
    """Connect to MongoDB on startup.

    Failures are logged but not raised so the app can boot before the
    database is provisioned (MongoDB is wired up on Day 5).
    """
    global db_client, db

    settings = get_settings()
    try:
        from motor.motor_asyncio import AsyncIOMotorClient

        db_client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = db_client[settings.DATABASE_NAME]
        await db_client.admin.command("ping")
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.info(f"MongoDB not available yet: {e}")


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
