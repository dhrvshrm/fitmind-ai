import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { recoveryService } from '../../services/recoveryService';
import type { RecoveryLogPayload } from '../../types/recovery';
import { useInvalidate } from './queryHelpers';

export function useRecoveryScore() {
  return useQuery({ queryKey: QUERY_KEYS.recovery.score, queryFn: recoveryService.getRecoveryScore });
}

export function useRecoveryHistory(days = 14) {
  return useQuery({
    queryKey: QUERY_KEYS.recovery.history(days),
    queryFn: () => recoveryService.getRecoveryHistory(days),
  });
}

/** Logs today's recovery; refreshes recovery, the dashboard and XP. */
export function useLogRecovery() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: RecoveryLogPayload) => recoveryService.logRecovery(payload),
    onSuccess: () =>
      invalidate(QUERY_KEYS.recovery.all, QUERY_KEYS.dashboard.all, QUERY_KEYS.gamification.all),
  });
}
