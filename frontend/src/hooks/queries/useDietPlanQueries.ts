import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { dietPlanService } from '../../services/dietPlanService';
import type { DietPlan, PlanSlot } from '../../types/dietPlan';
import { useInvalidate } from './queryHelpers';

export function useDietPlan() {
  return useQuery({ queryKey: QUERY_KEYS.dietPlan.current, queryFn: dietPlanService.getCurrent });
}

/** Every plan change returns the new version; store it instead of refetching. */
function useSetPlan() {
  const queryClient = useQueryClient();
  return (plan: DietPlan) => {
    queryClient.setQueryData(QUERY_KEYS.dietPlan.current, plan);
    // Swap suggestions depend on the plan's items, so drop any cached ones.
    queryClient.removeQueries({ queryKey: QUERY_KEYS.dietPlan.swapRoot });
  };
}

export function useCreateDietPlan() {
  const setPlan = useSetPlan();
  return useMutation({ mutationFn: dietPlanService.create, onSuccess: setPlan });
}

export function useRegeneratePlanMeal() {
  const setPlan = useSetPlan();
  return useMutation({
    mutationFn: (mealId: PlanSlot) => dietPlanService.regenerateMeal(mealId),
    onSuccess: setPlan,
  });
}

/** Swap suggestions for one item; `query` narrows them by name (2+ characters). */
export function usePlanSwapOptions(mealId: PlanSlot, index: number, query: string, enabled: boolean) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: QUERY_KEYS.dietPlan.swapOptions(mealId, index, trimmed),
    queryFn: () => dietPlanService.swapOptions(mealId, index, trimmed || undefined),
    enabled: enabled && trimmed.length !== 1,
  });
}

export function useSwapPlanItem() {
  const setPlan = useSetPlan();
  return useMutation({
    mutationFn: ({ mealId, index, foodId }: { mealId: PlanSlot; index: number; foodId: string }) =>
      dietPlanService.swapItem(mealId, index, foodId),
    onSuccess: setPlan,
  });
}

/** Logs a planned meal; refreshes nutrition, dashboard and XP like any logged meal. */
export function useLogPlanMeal() {
  const setPlan = useSetPlan();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (mealId: PlanSlot) => dietPlanService.logMeal(mealId),
    onSuccess: (result) => {
      setPlan(result.plan);
      return invalidate(QUERY_KEYS.nutrition.all, QUERY_KEYS.dashboard.all, QUERY_KEYS.gamification.all);
    },
  });
}
