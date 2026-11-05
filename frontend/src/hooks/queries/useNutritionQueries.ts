import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { nutritionService } from '../../services/nutritionService';
import type {
  MealPayload,
  MealType,
  MealUpdatePayload,
  NutritionSummary,
  UserFoodPayload,
} from '../../types/nutrition';
import { useInvalidate } from './queryHelpers';

export function useNutritionToday() {
  return useQuery({ queryKey: QUERY_KEYS.nutrition.today, queryFn: nutritionService.getTodaySummary });
}

export function useRecentMeals() {
  return useQuery({ queryKey: QUERY_KEYS.nutrition.recent, queryFn: nutritionService.getRecentMeals });
}

export function useSavedMeals() {
  return useQuery({ queryKey: QUERY_KEYS.nutrition.savedMeals, queryFn: nutritionService.getSavedMeals });
}

export function useUserFoods() {
  return useQuery({ queryKey: QUERY_KEYS.nutrition.userFoods, queryFn: nutritionService.getUserFoods });
}

/** Food name search for swapping a matched food; runs once there are 2+ characters. */
export function useFoodSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: QUERY_KEYS.nutrition.foodSearch(trimmed),
    queryFn: () => nutritionService.searchFoods(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
  });
}

/** Estimates a described meal. Nothing is stored, so no caches change. */
export function useEstimateMeal() {
  return useMutation({ mutationFn: (text: string) => nutritionService.estimate(text) });
}

/** Everything a logged or changed meal affects: nutrition, dashboard and XP. */
function useMealInvalidation() {
  const invalidate = useInvalidate();
  return () =>
    invalidate(QUERY_KEYS.nutrition.all, QUERY_KEYS.dashboard.all, QUERY_KEYS.gamification.all);
}

/** Logs a meal; refreshes nutrition plus the dashboard and XP that it affects. */
export function useLogMeal() {
  const onSuccess = useMealInvalidation();
  return useMutation({
    mutationFn: (payload: MealPayload) => nutritionService.logMeal(payload),
    onSuccess,
  });
}

/** Logs several meals in one request; same refreshes as a single meal. */
export function useLogMeals() {
  const onSuccess = useMealInvalidation();
  return useMutation({
    mutationFn: (meals: MealPayload[]) => nutritionService.logMeals(meals),
    onSuccess,
  });
}

/** Speech to text for meal logging. Nothing is stored, so no caches change. */
export function useTranscribeMeal() {
  return useMutation({ mutationFn: (audio: Blob) => nutritionService.transcribe(audio) });
}

export function useUpdateMeal() {
  const onSuccess = useMealInvalidation();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MealUpdatePayload }) =>
      nutritionService.updateMeal(id, payload),
    onSuccess,
  });
}

export function useDeleteMeal() {
  const onSuccess = useMealInvalidation();
  return useMutation({
    mutationFn: (id: string) => nutritionService.deleteMeal(id),
    onSuccess,
  });
}

export function useSaveMeal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ name, mealId }: { name: string; mealId: string }) =>
      nutritionService.saveMeal(name, mealId),
    onSuccess: () => invalidate(QUERY_KEYS.nutrition.savedMeals),
  });
}

export function useLogSavedMeal() {
  const onSuccess = useMealInvalidation();
  return useMutation({
    mutationFn: ({ id, mealType }: { id: string; mealType?: MealType }) =>
      nutritionService.logSavedMeal(id, mealType),
    onSuccess,
  });
}

export function useDeleteSavedMeal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => nutritionService.deleteSavedMeal(id),
    onSuccess: () => invalidate(QUERY_KEYS.nutrition.savedMeals),
  });
}

export function useCreateUserFood() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: UserFoodPayload) => nutritionService.createUserFood(payload),
    onSuccess: () => invalidate(QUERY_KEYS.nutrition.userFoods),
  });
}

export function useDeleteUserFood() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => nutritionService.deleteUserFood(id),
    onSuccess: () => invalidate(QUERY_KEYS.nutrition.userFoods),
  });
}

/** Logs water; the response carries the new total, so the cache is patched directly. */
export function useLogWater() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountMl: number) => nutritionService.logWater(amountMl),
    onSuccess: (waterMl) =>
      queryClient.setQueryData<NutritionSummary>(QUERY_KEYS.nutrition.today, (prev) =>
        prev ? { ...prev, water_ml: waterMl } : prev,
      ),
  });
}
