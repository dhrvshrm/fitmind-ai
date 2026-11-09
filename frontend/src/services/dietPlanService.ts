import { apiClient } from '../lib/apiClient';
import { DIET_PLAN_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { DietPlan, PlanItem, PlanMealLogResult, PlanSlot } from '../types/dietPlan';

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
};
