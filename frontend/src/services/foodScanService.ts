import axios from 'axios';
import { apiClient } from '../lib/apiClient';
import { FOOD_SCAN_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { BarcodeProduct, FoodScanErrorCode } from '../types/foodScan';
import type { MealEstimate } from '../types/nutrition';

/** The error code the barcode and photo endpoints put in `data.code`, if any. */
export function foodScanErrorCode(error: unknown): FoodScanErrorCode | null {
  if (!axios.isAxiosError(error)) return null;
  const body = error.response?.data as { data?: { code?: FoodScanErrorCode } } | undefined;
  return body?.data?.code ?? null;
}

/** Barcode lookups (Open Food Facts) and meal photo estimates. Nothing is logged here. */
export const foodScanService = {
  async lookupBarcode(code: string): Promise<BarcodeProduct> {
    const { data } = await apiClient.get<ApiEnvelope<BarcodeProduct>>(FOOD_SCAN_ENDPOINTS.barcode(code));
    return data.data;
  },

  async estimatePhoto(image: Blob, filename: string): Promise<MealEstimate> {
    const form = new FormData();
    form.append('image', image, filename);
    const { data } = await apiClient.post<ApiEnvelope<MealEstimate>>(
      FOOD_SCAN_ENDPOINTS.PHOTO,
      form,
      // Let the browser set the multipart boundary itself.
      { headers: { 'Content-Type': undefined as unknown as string } },
    );
    return data.data;
  },
};
