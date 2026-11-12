"""Packaged-food lookup by barcode on Open Food Facts.

Open Food Facts is a free, open (ODbL) database of products and their
nutrition labels, contributed by volunteers. Values are what the label says
per 100 g (or 100 ml); coverage of Indian products is patchy, so "not found"
is a normal answer and the user can describe the food instead.

Lookups are cached in the ``food_barcodes`` collection (no personal data):
found products for 30 days, misses for 1 day so new entries show up.
API: https://world.openfoodfacts.org/api/v2/product/{code}.json
"""
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.config.database import get_database
from app.nutrition.food_db import Nutrients

logger = logging.getLogger(__name__)

API_URL = "https://world.openfoodfacts.org/api/v2/product/{code}.json"
# Open Food Facts asks apps to identify themselves; no personal contact details here.
USER_AGENT = "FitMindAI/1.0 (fitness and nutrition app)"
FIELDS = (
    "code,product_name,product_name_en,generic_name,brands,quantity,product_quantity,"
    "serving_size,serving_quantity,nutriments,image_front_small_url,nutrition_data_per"
)
TIMEOUT_SECONDS = 8.0
SOURCE = "open_food_facts"
SOURCE_NAME = "Open Food Facts"

CACHE_COLLECTION = "food_barcodes"
FOUND_TTL = timedelta(days=30)
MISSING_TTL = timedelta(days=1)
_MEMORY_CACHE: Dict[str, dict] = {}

KJ_PER_KCAL = 4.184
# EAN-8, UPC-A (12), EAN-13 and GTIN-14.
BARCODE_PATTERN = re.compile(r"^\d{8}$|^\d{12,14}$")


class BarcodeLookupError(Exception):
    """The lookup service couldn't be reached (not the same as "not found")."""


def normalize_barcode(raw: str) -> Optional[str]:
    """Digits only; None if it isn't a plausible retail barcode."""
    code = re.sub(r"[\s-]", "", raw or "")
    return code if BARCODE_PATTERN.match(code) else None


def _number(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number >= 0 else None


def per_100g(nutriments: Dict[str, Any]) -> Optional[Nutrients]:
    """Label values per 100 g (or ml), or None when energy is missing."""
    kcal = _number(nutriments.get("energy-kcal_100g"))
    if kcal is None:
        kj = _number(nutriments.get("energy-kj_100g")) or _number(nutriments.get("energy_100g"))
        kcal = kj / KJ_PER_KCAL if kj is not None else None
    if kcal is None:
        return None
    return Nutrients(
        kcal=round(kcal, 1),
        protein=round(_number(nutriments.get("proteins_100g")) or 0, 1),
        carbs=round(_number(nutriments.get("carbohydrates_100g")) or 0, 1),
        fat=round(_number(nutriments.get("fat_100g")) or 0, 1),
        fiber=round(_number(nutriments.get("fiber_100g")) or 0, 1),
    )


def _serving_options(product: Dict[str, Any]) -> List[dict]:
    """Ways to pick an amount: per 100 g, one serving, the whole pack."""
    options = [{"id": "100g", "label": "100 g", "grams": 100.0}]
    serving = _number(product.get("serving_quantity"))
    if serving and 0 < serving <= 3000:
        size = (product.get("serving_size") or f"{serving:g} g").strip()
        options.append({"id": "serving", "label": f"1 serving ({size})", "grams": round(serving, 1)})
    pack = _number(product.get("product_quantity"))
    if pack and 0 < pack <= 5000 and pack != serving:
        size = (product.get("quantity") or f"{pack:g} g").strip()
        options.append({"id": "pack", "label": f"Whole pack ({size})", "grams": round(pack, 1)})
    return options


def map_product(code: str, product: Dict[str, Any]) -> dict:
    """Our shape for a product: name, per-100 g values and serving options."""
    name = (
        product.get("product_name")
        or product.get("product_name_en")
        or product.get("generic_name")
        or ""
    ).strip()
    brand = (product.get("brands") or "").split(",")[0].strip()
    nutrients = per_100g(product.get("nutriments") or {})
    options = _serving_options(product)
    default = next((o for o in options if o["id"] == "serving"), options[0])
    return {
        "barcode": code,
        "name": name or "Unnamed product",
        "brand": brand or None,
        "image": product.get("image_front_small_url"),
        "per_100g": nutrients.model_dump() if nutrients else None,
        "has_nutrition": nutrients is not None,
        "serving_options": options,
        "default_serving": default["id"],
        "source": SOURCE,
        "source_name": SOURCE_NAME,
        "source_url": f"https://world.openfoodfacts.org/product/{code}",
    }


async def _cached(code: str) -> Optional[dict]:
    db = get_database()
    doc = (
        await db[CACHE_COLLECTION].find_one({"code": code}, {"_id": 0}) if db is not None
        else _MEMORY_CACHE.get(code)
    )
    if not doc:
        return None
    expires = doc["expires_at"]
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return doc if expires > datetime.now(timezone.utc) else None


async def _store(code: str, product: Optional[dict]) -> None:
    now = datetime.now(timezone.utc)
    doc = {
        "code": code,
        "found": product is not None,
        "product": product,
        "fetched_at": now,
        "expires_at": now + (FOUND_TTL if product else MISSING_TTL),
    }
    db = get_database()
    if db is not None:
        await db[CACHE_COLLECTION].update_one({"code": code}, {"$set": doc}, upsert=True)
    else:
        _MEMORY_CACHE[code] = doc


async def _fetch(code: str) -> Optional[dict]:
    """Raw product from the API, or None when it isn't in the database."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}) as client:
            response = await client.get(API_URL.format(code=code), params={"fields": FIELDS})
    except httpx.HTTPError as e:
        raise BarcodeLookupError(f"Open Food Facts unreachable: {e}") from e
    if response.status_code == 404:
        return None
    if response.status_code != 200:
        raise BarcodeLookupError(f"Open Food Facts returned {response.status_code}")
    try:
        body = response.json()
    except ValueError as e:
        raise BarcodeLookupError("Open Food Facts sent an unreadable response") from e
    if body.get("status") != 1 or not body.get("product"):
        return None
    return body["product"]


async def lookup(code: str) -> Optional[dict]:
    """The mapped product for ``code``, or None if Open Food Facts doesn't have it.

    Raises:
        BarcodeLookupError: if the service can't be reached (nothing is cached then).
    """
    cached = await _cached(code)
    if cached is not None:
        return cached["product"]
    raw = await _fetch(code)
    product = map_product(code, raw) if raw else None
    await _store(code, product)
    return product
