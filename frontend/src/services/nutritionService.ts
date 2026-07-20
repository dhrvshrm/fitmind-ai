import { apiClient } from '../lib/apiClient';
import { NUTRITION_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  MealLogResult,
  MealPayload,
  NutritionSummary,
} from '../types/nutrition';

/** Nutrition API. Unwraps the backend `{ success, message, data }` envelope. */
export const nutritionService = {
  /** Logs a meal; awards +10 XP server-side. */
  async logMeal(payload: MealPayload): Promise<MealLogResult> {
    const { data } = await apiClient.post<ApiEnvelope<MealLogResult>>(
      NUTRITION_ENDPOINTS.MEAL,
      payload,
    );
    return data.data;
  },

  async getTodaySummary(): Promise<NutritionSummary> {
    const { data } = await apiClient.get<ApiEnvelope<NutritionSummary>>(
      NUTRITION_ENDPOINTS.TODAY,
    );
    return data.data;
  },

  /**
   * Adjusts today's water total by `amountMl` (negative undoes a glass;
   * the backend clamps at zero) and returns the new total.
   */
  async logWater(amountMl: number): Promise<number> {
    const { data } = await apiClient.post<ApiEnvelope<{ water_ml: number }>>(
      NUTRITION_ENDPOINTS.WATER,
      { amount_ml: amountMl },
    );
    return data.data.water_ml;
  },
};
