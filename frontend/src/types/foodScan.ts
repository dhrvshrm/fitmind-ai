import type { Nutrients } from './nutrition';

/** Barcode and photo logging types, aligned with the backend. */

export type ServingOption = {
  id: 'serving' | 'pack' | '100g';
  label: string;
  grams: number;
};

/** `GET /nutrition/barcode/{code}` -> data. */
export type BarcodeProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  image: string | null;
  per_100g: Nutrients | null;
  has_nutrition: boolean;
  serving_options: ServingOption[];
  default_serving: ServingOption['id'];
  source: 'open_food_facts';
  source_name: string;
  source_url: string;
};

/** Error codes the barcode and photo endpoints send in `data.code`. */
export type FoodScanErrorCode =
  | 'invalid_barcode'
  | 'not_found'
  | 'lookup_unavailable'
  | 'empty_image'
  | 'image_too_large'
  | 'unsupported_image'
  | 'no_food'
  | 'ai_quota'
  | 'ai_unavailable'
  | 'ai_not_configured';
