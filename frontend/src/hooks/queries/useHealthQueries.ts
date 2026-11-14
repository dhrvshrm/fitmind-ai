import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { healthService } from '../../services/healthService';
import type { ConsentScope, HealthProfilePayload } from '../../types/health';
import { useInvalidate } from './queryHelpers';

export function useConsents() {
  return useQuery({ queryKey: QUERY_KEYS.health.consents, queryFn: healthService.getConsents });
}

export function useHealthProfile() {
  return useQuery({ queryKey: QUERY_KEYS.health.profile, queryFn: healthService.getProfile });
}

/** Consent changes what the profile endpoint returns, so both are refreshed. */
export function useGrantConsent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (scope: ConsentScope) => healthService.grantConsent(scope),
    onSuccess: () => invalidate(QUERY_KEYS.health.all),
  });
}

/** Withdrawing deletes the data, and meal plan targets may change with it. */
export function useWithdrawConsent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (scope: ConsentScope) => healthService.withdrawConsent(scope),
    onSuccess: () => invalidate(QUERY_KEYS.health.all, QUERY_KEYS.dietPlan.all),
  });
}

export function useSaveHealthProfile() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: HealthProfilePayload) => healthService.saveProfile(payload),
    onSuccess: (view) => {
      queryClient.setQueryData(QUERY_KEYS.health.profile, view);
      return invalidate(QUERY_KEYS.dietPlan.all);
    },
  });
}
