from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import JSONResponse

from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.schemas.general import SuccessResponse
from app.services import food_scan_service
from app.services.food_scan_service import FoodScanError

# Lives under /nutrition next to the other logging helpers; kept in its own
# module so barcode and photo logging stay separate from the meal endpoints.
router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


def _error(exc: FoodScanError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={"success": False, "message": str(exc), "data": {"code": exc.code}},
    )


@router.get("/barcode/{code}", response_model=SuccessResponse)
async def lookup_barcode(code: str, current_user: User = Depends(get_current_user)):
    """Look up a packaged food by barcode on Open Food Facts (cached).

    Returns label values per 100 g and serving options. 404 when the product
    isn't in the database. Nothing is logged.
    """
    try:
        product = await food_scan_service.lookup_barcode(code)
    except FoodScanError as exc:
        return _error(exc)
    return {"success": True, "message": "Product found", "data": product}


@router.post("/photo-estimate", response_model=SuccessResponse)
async def estimate_from_photo(
    image: UploadFile = File(...), current_user: User = Depends(get_current_user)
):
    """Estimate a meal from a photo: AI names the dishes, the food database gives the numbers.

    Returns the same shape as ``POST /nutrition/estimate`` for review. The
    photo is not stored.
    """
    data = await image.read(food_scan_service.MAX_IMAGE_BYTES + 1)
    try:
        estimate = await food_scan_service.estimate_photo(
            current_user.id, data, (image.content_type or "").lower()
        )
    except FoodScanError as exc:
        return _error(exc)
    return {"success": True, "message": "Meal estimated from photo", "data": estimate}
