import { apiClient } from '../lib/apiClient';
import { NUTRITION_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  Food,
  Meal,
  MealEstimate,
  MealLogResult,
  MealPayload,
  MealType,
  MealUpdatePayload,
  NutritionSummary,
  RecentMeal,
  SavedMeal,
  UserFood,
  UserFoodPayload,
} from '../types/nutrition';

/** Nutrition API. Unwraps the backend `{ success, message, data }` envelope. */
export const nutritionService = {
  /** Logs a meal; awards meal XP server-side (capped per day). */
  async logMeal(payload: MealPayload): Promise<MealLogResult> {
    const { data } = await apiClient.post<ApiEnvelope<MealLogResult>>(
      NUTRITION_ENDPOINTS.MEAL,
      payload,
    );
    return data.data;
  },

  async updateMeal(id: string, payload: MealUpdatePayload): Promise<Meal> {
    const { data } = await apiClient.put<ApiEnvelope<{ meal: Meal }>>(
      NUTRITION_ENDPOINTS.meal(id),
      payload,
    );
    return data.data.meal;
  },

  async deleteMeal(id: string): Promise<void> {
    await apiClient.delete(NUTRITION_ENDPOINTS.meal(id));
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

  /** Estimates nutrition for a meal described in words. Saves nothing. */
  async estimate(text: string): Promise<MealEstimate> {
    const { data } = await apiClient.post<ApiEnvelope<MealEstimate>>(
      NUTRITION_ENDPOINTS.ESTIMATE,
      { text },
    );
    return data.data;
  },

  async searchFoods(query: string): Promise<Food[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ foods: Food[] }>>(
      NUTRITION_ENDPOINTS.FOOD_SEARCH,
      { params: { q: query } },
    );
    return data.data.foods;
  },

  async getFood(id: string): Promise<Food> {
    const { data } = await apiClient.get<ApiEnvelope<Food>>(NUTRITION_ENDPOINTS.food(id));
    return data.data;
  },

  async getRecentMeals(): Promise<RecentMeal[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ meals: RecentMeal[] }>>(
      NUTRITION_ENDPOINTS.RECENT,
    );
    return data.data.meals;
  },

  async getSavedMeals(): Promise<SavedMeal[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ saved_meals: SavedMeal[] }>>(
      NUTRITION_ENDPOINTS.SAVED_MEALS,
    );
    return data.data.saved_meals;
  },

  /** Saves a logged meal as a reusable "usual" meal. */
  async saveMeal(name: string, fromMealId: string): Promise<SavedMeal> {
    const { data } = await apiClient.post<ApiEnvelope<{ saved_meal: SavedMeal }>>(
      NUTRITION_ENDPOINTS.SAVED_MEALS,
      { name, from_meal_id: fromMealId },
    );
    return data.data.saved_meal;
  },

  async logSavedMeal(id: string, mealType?: MealType): Promise<MealLogResult> {
    const { data } = await apiClient.post<ApiEnvelope<MealLogResult>>(
      NUTRITION_ENDPOINTS.logSavedMeal(id),
      { meal_type: mealType },
    );
    return data.data;
  },

  async deleteSavedMeal(id: string): Promise<void> {
    await apiClient.delete(NUTRITION_ENDPOINTS.savedMeal(id));
  },

  async getUserFoods(): Promise<UserFood[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ foods: UserFood[] }>>(
      NUTRITION_ENDPOINTS.MY_FOODS,
    );
    return data.data.foods;
  },

  async createUserFood(payload: UserFoodPayload): Promise<UserFood> {
    const { data } = await apiClient.post<ApiEnvelope<{ food: UserFood }>>(
      NUTRITION_ENDPOINTS.MY_FOODS,
      payload,
    );
    return data.data.food;
  },

  async deleteUserFood(id: string): Promise<void> {
    await apiClient.delete(NUTRITION_ENDPOINTS.myFood(id));
  },
};
