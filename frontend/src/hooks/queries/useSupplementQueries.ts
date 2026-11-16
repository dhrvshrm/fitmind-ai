import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { SUPPLEMENT_HISTORY_DAYS } from '../../constants/supplements';
import { supplementService } from '../../services/supplementService';
import type { UserSupplementPayload, UserSupplementUpdate } from '../../types/supplements';
import { useInvalidate } from './queryHelpers';

export function useSupplementCatalog() {
  return useQuery({
    queryKey: QUERY_KEYS.supplements.catalog,
    queryFn: supplementService.getCatalog,
    staleTime: 10 * 60_000,
  });
}

export function useMySupplements() {
  return useQuery({ queryKey: QUERY_KEYS.supplements.mine, queryFn: supplementService.getMine });
}

export function useSupplementHistory(days: number = SUPPLEMENT_HISTORY_DAYS) {
  return useQuery({
    queryKey: QUERY_KEYS.supplements.history(days),
    queryFn: () => supplementService.getHistory(days),
  });
}

export function useSupplementRoutine() {
  return useQuery({ queryKey: QUERY_KEYS.supplements.routine, queryFn: supplementService.getRoutine });
}

export function useSupplementEssentials(budget: number) {
  return useQuery({
    queryKey: QUERY_KEYS.supplements.essentials(budget),
    queryFn: () => supplementService.getEssentials(budget),
    staleTime: 5 * 60_000,
  });
}

/** Serving and macros for a product name; nothing is stored. */
export function useEstimateLabel() {
  return useMutation({
    mutationFn: ({ product, supplementId }: { product: string; supplementId?: string | null }) =>
      supplementService.estimate(product, supplementId),
  });
}

/** Any change to the list refreshes it, its history, and the meal plan it's part of. */
function useListInvalidation() {
  const invalidate = useInvalidate();
  return () => invalidate(QUERY_KEYS.supplements.all, QUERY_KEYS.dietPlan.current);
}

export function useAddSupplement() {
  const onSuccess = useListInvalidation();
  return useMutation({ mutationFn: (payload: UserSupplementPayload) => supplementService.add(payload), onSuccess });
}

export function useUpdateSupplement() {
  const onSuccess = useListInvalidation();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UserSupplementUpdate }) =>
      supplementService.update(id, changes),
    onSuccess,
  });
}

export function useRemoveSupplement() {
  const onSuccess = useListInvalidation();
  return useMutation({ mutationFn: (id: string) => supplementService.remove(id), onSuccess });
}

/** Ticking a protein powder logs its macros, so nutrition and the meal plan refresh too. */
export function useSetSupplementTaken() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, taken }: { id: string; taken: boolean }) => supplementService.setTaken(id, taken),
    onSuccess: () =>
      invalidate(
        QUERY_KEYS.supplements.all,
        QUERY_KEYS.nutrition.all,
        QUERY_KEYS.dashboard.all,
        QUERY_KEYS.dietPlan.current,
      ),
  });
}
