import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { dietPlanService } from '../../services/dietPlanService';
import { userService } from '../../services/userService';
import type { DietPlan, PlanSlot } from '../../types/dietPlan';
import type { FastingModePayload, ShiftTimesPayload } from '../../types/indiaFirst';
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

/** The plan's shopping list for `days` days. */
export function useGroceryList(days: number, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.dietPlan.groceryList(days),
    queryFn: () => dietPlanService.groceryList(days),
    enabled,
  });
}

export function useFastingModes() {
  return useQuery({ queryKey: QUERY_KEYS.dietPlan.fastingModes, queryFn: dietPlanService.fastingModes });
}

/** Turning a mode on or off changes what the plan should follow, so refresh it. */
export function useAddFastingMode() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: FastingModePayload) => dietPlanService.addFastingMode(payload),
    onSuccess: () => invalidate(QUERY_KEYS.dietPlan.all),
  });
}

export function useRemoveFastingMode() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => dietPlanService.removeFastingMode(id),
    onSuccess: () => invalidate(QUERY_KEYS.dietPlan.all),
  });
}

/** New wake and sleep times move the plan's meal times, and can change targets. */
export function useUpdateShiftTimes() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: ShiftTimesPayload) => userService.updatePersonalisation(payload),
    onSuccess: () => invalidate(QUERY_KEYS.dietPlan.all, QUERY_KEYS.profile.all, QUERY_KEYS.nutrition.all),
  });
}
