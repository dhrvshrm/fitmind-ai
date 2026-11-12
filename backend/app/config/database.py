import logging
from typing import Optional

import certifi
from pymongo.errors import OperationFailure

from app.config.settings import get_settings

logger = logging.getLogger(__name__)

db_client = None
db = None


async def connect_to_mongo() -> None:
    """Connect to MongoDB on startup.

    Locally, failures are logged and ``db_client``/``db`` stay ``None`` so
    :func:`get_database` reports "no database" and callers fall back to the
    in-memory store. In production the in-memory store would silently lose
    data on restart, so a failed connection is re-raised and startup aborts.
    """
    global db_client, db

    settings = get_settings()
    try:
        from motor.motor_asyncio import AsyncIOMotorClient

        # Atlas (mongodb+srv) uses TLS and needs a CA bundle; a plain local
        # mongodb:// connection is non-TLS, so tlsCAFile must NOT be passed
        # there or it forces TLS and the handshake fails.
        options: dict = {"serverSelectionTimeoutMS": 5000, "tz_aware": True}
        if settings.MONGODB_URL.startswith("mongodb+srv://") or "tls=true" in settings.MONGODB_URL.lower():
            options["tlsCAFile"] = certifi.where()

        client = AsyncIOMotorClient(settings.MONGODB_URL, **options)
        # Verify connectivity BEFORE exposing the handles globally.
        await client.admin.command("ping")
        db_client = client
        db = client[settings.DATABASE_NAME]
        logger.info("Connected to MongoDB")
        await ensure_indexes(db)
    except Exception as e:
        db_client = None
        db = None
        if not settings.allows_memory_fallback:
            logger.error("MongoDB unavailable in %s - refusing to start: %s", settings.DATABASE_ENV, e)
            raise
        logger.warning(f"MongoDB unavailable - using in-memory fallback: {e}")


# Indexes to create on startup, per collection, as (keys, options). These
# back the app's hottest lookups (by user + date) so common queries stay fast
# as data grows.
_INDEXES = {
    "users": [
        ([("id", 1)], {"unique": True}),
        ([("email", 1)], {"unique": True}),
        ([("username", 1)], {}),
    ],
    "recovery_logs": [([("user_id", 1), ("log_date", -1)], {})],
    "voice_checkins": [([("user_id", 1), ("created_at", -1)], {})],
    "workout_plans": [([("user_id", 1), ("created_at", -1)], {})],
    "workout_logs": [([("user_id", 1), ("log_date", -1)], {})],
    "workout_progress": [([("user_id", 1), ("log_date", -1)], {})],
    "meals": [([("user_id", 1), ("log_date", -1)], {})],
    "water_intake": [([("user_id", 1), ("log_date", -1)], {})],
    "weight_logs": [([("user_id", 1), ("log_date", -1)], {})],
    "notifications": [([("user_id", 1), ("delivered", 1), ("read", 1)], {})],
    "friendships": [
        ([("requester_id", 1), ("status", 1)], {}),
        ([("addressee_id", 1), ("status", 1)], {}),
    ],
    "weekly_reports": [([("user_id", 1), ("created_at", -1)], {})],
    "xp_events": [
        ([("user_id", 1), ("action", 1), ("local_date", 1)], {}),
        ([("user_id", 1), ("key", 1)], {"unique": True}),
    ],
    "audit_logs": [([("user_id", 1), ("at", -1)], {})],
    "ai_usage": [([("user_id", 1), ("local_date", 1)], {"unique": True})],
    "saved_meals": [([("user_id", 1), ("last_logged_at", -1)], {})],
    "user_foods": [([("user_id", 1), ("created_at", -1)], {})],
    "diet_plans": [([("user_id", 1), ("status", 1), ("version", -1)], {})],
    "workout_overrides": [([("user_id", 1), ("local_date", 1)], {"unique": True})],
    # Phase 11: one step entry per user per local day; one settings doc per user.
    "step_logs": [([("user_id", 1), ("local_date", 1)], {"unique": True})],
    "activity_settings": [([("user_id", 1)], {"unique": True})],
    # Phase 7: analytics events, push subscriptions, reminder settings and the
    # once-a-day reminder log.
    "analytics_events": [
        ([("event", 1), ("local_date", 1)], {}),
        ([("user_id", 1), ("at", -1)], {}),
    ],
    "push_subscriptions": [([("endpoint", 1)], {"unique": True}), ([("user_id", 1)], {})],
    "reminder_settings": [([("user_id", 1)], {"unique": True})],
    "reminder_sends": [([("user_id", 1), ("key", 1), ("local_date", 1)], {"unique": True})],
    # Open Food Facts barcode cache (no personal data); entries expire on their own.
    "food_barcodes": [
        ([("code", 1)], {"unique": True}),
        ([("expires_at", 1)], {"expireAfterSeconds": 0}),
    ],
    # Phase 10: progress measurements, flexible days, target decisions,
    # weekly insights, progress photos and friend challenges.
    "body_measurements": [([("user_id", 1), ("log_date", -1)], {"unique": True})],
    "flexible_days": [([("user_id", 1), ("date", 1)], {"unique": True})],
    "target_history": [([("user_id", 1), ("at", -1)], {})],
    "weekly_insights": [([("user_id", 1), ("week_start", 1)], {"unique": True})],
    "progress_photos": [([("user_id", 1), ("log_date", -1)], {})],
    "friend_challenges": [([("creator_id", 1)], {}), ([("opponent_id", 1)], {})],
    # Phases 12-14 health: consent, health profile, lab reports, supplements.
    "consents": [([("user_id", 1), ("scope", 1), ("revoked_at", 1)], {})],
    "health_profiles": [([("user_id", 1)], {"unique": True})],
    "health_reports": [([("user_id", 1), ("created_at", -1)], {})],
    "health_report_files": [([("user_id", 1), ("report_id", 1)], {})],
    "biomarkers": [([("user_id", 1), ("code", 1), ("measured_at", 1)], {}), ([("report_id", 1)], {})],
    "user_supplements": [([("user_id", 1), ("active", 1)], {})],
    "supplement_logs": [([("user_id", 1), ("local_date", 1), ("user_supplement_id", 1)], {})],
    # Cached AI results expire on their own via a TTL index.
    "ai_cache": [
        ([("key", 1)], {"unique": True}),
        ([("expires_at", 1)], {"expireAfterSeconds": 0}),
    ],
}


# MongoDB error codes for "an index on these keys exists with other options/name".
_INDEX_EXISTS_CODES = {85, 86}


async def ensure_indexes(database) -> None:
    """Create the app's indexes (idempotent; safe to run on every startup).

    Each index is created independently so one failure (e.g. a unique index
    over legacy duplicate data) doesn't stop the rest from being created.
    """
    for collection, specs in _INDEXES.items():
        for keys, options in specs:
            try:
                await database[collection].create_index(keys, **options)
            except OperationFailure as e:
                if e.code in _INDEX_EXISTS_CODES:
                    # An older index on the same keys has different options (e.g.
                    # created before it was unique). It still works for lookups;
                    # changing it needs a manual migration, so leave it alone.
                    logger.info(
                        "Index %s on %s already exists with different options; left unchanged",
                        keys, collection,
                    )
                    continue
                logger.warning("Could not create index %s on %s: %s", keys, collection, e)
            except Exception as e:
                logger.warning("Could not create index %s on %s: %s", keys, collection, e)
    logger.info("Ensured MongoDB indexes")


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
