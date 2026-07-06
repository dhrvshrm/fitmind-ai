import logging

logger = logging.getLogger(__name__)

db_client = None
db = None


async def connect_to_mongo():
    """Connect to MongoDB on startup"""
    global db_client, db

    try:
        from motor.motor_asyncio import AsyncIOMotorClient

        db_client = AsyncIOMotorClient("mongodb://localhost:27017")
        db = db_client["fitmind"]
        await db_client.admin.command("ping")
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.info(f"MongoDB not available yet: {e}")


async def close_mongo_connection():
    """Close MongoDB connection on shutdown"""
    global db_client
    if db_client:
        db_client.close()
        logger.info("Closed MongoDB connection")


