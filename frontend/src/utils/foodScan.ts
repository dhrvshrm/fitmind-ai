import { ACTIVITY_STRINGS } from '../constants/activityStrings';
import { PHOTO_JPEG_QUALITY, PHOTO_MAX_SIDE } from '../constants/activity';
import type { BarcodeProduct, ServingOption } from '../types/foodScan';
import type { EstimatedItem, MealEstimate } from '../types/nutrition';
import { scaleNutrients } from './nutrition';

const B = ACTIVITY_STRINGS.barcode;

/** Unit shown in the review row for a serving choice. */
function unitFor(option: ServingOption): string {
  if (option.id === 'serving') return B.unitServing;
  if (option.id === 'pack') return B.unitPack;
  return B.unitGram;
}

/** Display name: brand first when the name doesn't already include it. */
export function productTitle(product: BarcodeProduct): string {
  if (!product.brand || product.name.toLowerCase().includes(product.brand.toLowerCase())) return product.name;
  return `${product.brand} ${product.name}`;
}

/**
 * Turns a scanned product and the chosen amount into the same estimate shape
 * a typed meal produces, so the normal review screen can edit and log it.
 * `count` is how many of the chosen serving (for "100 g", grams / 100).
 */
export function barcodeEstimate(product: BarcodeProduct, option: ServingOption, count: number): MealEstimate {
  const per100 = product.per_100g;
  const grams = Math.round(option.grams * count * 10) / 10;
  const per100g = option.id === '100g';
  const nutrients = per100 ? scaleNutrients(per100, grams) : null;
  const item: EstimatedItem = {
    query: productTitle(product),
    name: productTitle(product),
    food_id: `off:${product.barcode}`,
    source: 'open_food_facts',
    verified: true,
    quantity: per100g ? grams : count,
    unit: unitFor(option),
    grams,
    quantity_assumed: false,
    nutrients,
    per_100g: per100,
    confidence: 'high',
    note: null,
    unresolved_reason: null,
    meal_type: null,
    eaten_at: null,
    alternatives: [],
  };
  return {
    text: productTitle(product),
    items: [item],
    totals: nutrients ?? { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    unresolved_count: 0,
  };
}

/**
 * Shrinks a phone photo to at most PHOTO_MAX_SIDE pixels as JPEG before
 * upload. Falls back to the original file when the browser can't decode it
 * (for example HEIC outside Safari); the server accepts those too.
 */
export async function shrinkPhoto(file: File): Promise<{ blob: Blob; filename: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return { blob: file, filename: file.name };
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY),
    );
    return blob ? { blob, filename: 'meal.jpg' } : { blob: file, filename: file.name };
  } catch {
    return { blob: file, filename: file.name };
  }
}
