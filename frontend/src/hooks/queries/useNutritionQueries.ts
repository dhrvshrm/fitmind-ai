import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { nutritionService } from '../../services/nutritionService';
import type { MealPayload, NutritionSummary } from '../../types/nutrition';
import { useInvalidate } from './queryHelpers';

export function useNutritionToday() {
  return useQuery({ queryKey: QUERY_KEYS.nutrition.today, queryFn: nutritionService.getTodaySummary });
}

/** Logs a meal; refreshes nutrition plus the dashboard and XP that it affects. */
export function useLogMeal() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: MealPayload) => nutritionService.logMeal(payload),
    onSuccess: () =>
      invalidate(QUERY_KEYS.nutrition.all, QUERY_KEYS.dashboard.all, QUERY_KEYS.gamification.all),
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
