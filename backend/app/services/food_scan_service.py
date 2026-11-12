"""Barcode lookups and meal-photo estimates for the food log.

Neither saves a meal: both return something for the user to review in the
normal estimate screen, then log through ``POST /nutrition/meal``.
"""
import logging
from typing import Any, Dict

from app.ai.client import AIError, AIQuotaError
from app.config.settings import get_settings
from app.nutrition import open_food_facts, photo
from app.services.nutrition_service import user_foods_as_foods

logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 6 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


class FoodScanError(Exception):
    """A user-facing problem; ``code`` lets the app show the right help."""

    def __init__(self, message: str, code: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.status = status


async def lookup_barcode(raw_code: str) -> Dict[str, Any]:
    """The product for a barcode, with per-100 g values and serving options.

    Raises:
        FoodScanError: invalid code (400), not found (404), or the lookup
            service is unreachable (503).
    """
    code = open_food_facts.normalize_barcode(raw_code)
    if code is None:
        raise FoodScanError("That doesn't look like a product barcode. Check the digits.", "invalid_barcode")
    try:
        product = await open_food_facts.lookup(code)
    except open_food_facts.BarcodeLookupError as e:
        logger.warning("Barcode lookup failed for %s: %s", code, e)
        raise FoodScanError(
            "Couldn't reach the product database. Try again, or describe the food instead.",
            "lookup_unavailable", 503,
        ) from e
    if product is None:
        raise FoodScanError(
            "This product isn't in Open Food Facts yet. Describe it instead, or add it as your own food.",
            "not_found", 404,
        )
    return product


async def estimate_photo(user_id: str, image: bytes, mime_type: str) -> Dict[str, Any]:
    """Identify the foods in a meal photo and estimate them from the food database.

    The image is not stored.

    Raises:
        FoodScanError: bad image (400), no food seen (422), or AI unavailable (503).
    """
    if not image:
        raise FoodScanError("The photo was empty.", "empty_image")
    if len(image) > MAX_IMAGE_BYTES:
        raise FoodScanError("That photo is too large. Use one under 6 MB.", "image_too_large")
    if mime_type not in IMAGE_TYPES:
        raise FoodScanError("Use a JPEG, PNG, WebP or HEIC photo.", "unsupported_image")
    try:
        dishes = await photo.identify_dishes(image, mime_type, user_id)
    except photo.PhotoNotFood as e:
        raise FoodScanError(
            "Couldn't spot any food in that photo. Try a clearer, closer shot or describe the meal.",
            "no_food", 422,
        ) from e
    except AIQuotaError as e:
        raise FoodScanError("Today's AI limit is used up. Describe the meal instead.", "ai_quota", 503) from e
    except AIError as e:
        configured = bool(get_settings().GEMINI_API_KEY)
        logger.info("Photo estimate unavailable: %s", e)
        raise FoodScanError(
            "Photo logging isn't available right now. Describe the meal instead."
            if configured else "Photo logging isn't set up on this server. Describe the meal instead.",
            "ai_unavailable" if configured else "ai_not_configured", 503,
        ) from e
    estimate = await photo.estimate_dishes(dishes, user_id, await user_foods_as_foods(user_id))
    return estimate.model_dump()
