import { apiClient } from '../lib/apiClient';
import { DIET_PLAN_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { DietPlan, PlanItem, PlanMealLogResult, PlanSlot } from '../types/dietPlan';
import type { FastingMode, FastingModePayload, FastingModesData, GroceryList } from '../types/indiaFirst';

/** Meal plan API. Unwraps the backend `{ success, message, data }` envelope. */
export const dietPlanService = {
  /** The current plan, or null when the user hasn't made one. */
  async getCurrent(): Promise<DietPlan | null> {
    const { data } = await apiClient.get<ApiEnvelope<DietPlan | null>>(DIET_PLAN_ENDPOINTS.CURRENT);
    return data.data;
  },

  /** Makes a new plan from the user's targets and food answers, replacing the current one. */
  async create(): Promise<DietPlan> {
    const { data } = await apiClient.post<ApiEnvelope<DietPlan>>(DIET_PLAN_ENDPOINTS.CREATE);
    return data.data;
  },

  async regenerateMeal(mealId: PlanSlot): Promise<DietPlan> {
    const { data } = await apiClient.post<ApiEnvelope<DietPlan>>(
      DIET_PLAN_ENDPOINTS.regenerateMeal(mealId),
    );
    return data.data;
  },

  /** Allowed foods that could replace one item, sized to about the same calories. */
  async swapOptions(mealId: PlanSlot, index: number, query?: string): Promise<PlanItem[]> {
    const { data } = await apiClient.get<ApiEnvelope<PlanItem[]>>(
      DIET_PLAN_ENDPOINTS.alternatives(mealId, index),
      { params: query ? { q: query } : undefined },
    );
    return data.data;
  },

  async swapItem(mealId: PlanSlot, index: number, foodId: string): Promise<DietPlan> {
    const { data } = await apiClient.post<ApiEnvelope<DietPlan>>(
      DIET_PLAN_ENDPOINTS.swap(mealId, index),
      { food_id: foodId },
    );
    return data.data;
  },

  /** Logs a planned meal as eaten today; awards meal XP like any logged meal. */
  async logMeal(mealId: PlanSlot): Promise<PlanMealLogResult> {
    const { data } = await apiClient.post<ApiEnvelope<PlanMealLogResult>>(
      DIET_PLAN_ENDPOINTS.logMeal(mealId),
    );
    return data.data;
  },

  /** The plan's dishes over `days` days as one list of ingredients, grouped by aisle. */
  async groceryList(days: number): Promise<GroceryList> {
    const { data } = await apiClient.get<ApiEnvelope<GroceryList>>(DIET_PLAN_ENDPOINTS.GROCERY_LIST, {
      params: { days },
    });
    return data.data;
  },

  /** Modes on offer, the user's current and upcoming ones, and today's. */
  async fastingModes(): Promise<FastingModesData> {
    const { data } = await apiClient.get<ApiEnvelope<FastingModesData>>(DIET_PLAN_ENDPOINTS.FASTING_MODES);
    return data.data;
  },

  async addFastingMode(payload: FastingModePayload): Promise<FastingMode> {
    const { data } = await apiClient.post<ApiEnvelope<FastingMode>>(DIET_PLAN_ENDPOINTS.FASTING_MODES, payload);
    return data.data;
  },

  async removeFastingMode(id: string): Promise<void> {
    await apiClient.delete(DIET_PLAN_ENDPOINTS.fastingMode(id));
  },
};
