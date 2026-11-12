import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { coachService } from '../../services/coachService';
import type { CoachDomain, MenuAdviceRequest } from '../../types/coach';

/** Which cached queries each coach action domain refreshes. */
const DOMAIN_KEYS: Record<CoachDomain, QueryKey[]> = {
  nutrition: [QUERY_KEYS.nutrition.all],
  dietPlan: [QUERY_KEYS.dietPlan.all],
  workouts: [QUERY_KEYS.workouts.all],
  recovery: [QUERY_KEYS.recovery.all],
  dashboard: [QUERY_KEYS.dashboard.all],
  gamification: [QUERY_KEYS.gamification.all],
};

/** Refetches every query a confirmed action touched, so other pages show the change. */
export function useInvalidateCoachDomains() {
  const queryClient = useQueryClient();
  return useCallback(
    (domains: CoachDomain[]) => {
      const keys = domains.flatMap((domain) => DOMAIN_KEYS[domain] ?? []);
      return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
    [queryClient],
  );
}

export function useCoachConversation(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.coach.conversation,
    queryFn: coachService.getConversation,
    enabled,
    // The page keeps its own live copy once loaded; don't overwrite it mid-chat.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });
}

export function useNewCoachChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: coachService.newConversation,
    onSuccess: (conversation) => queryClient.setQueryData(QUERY_KEYS.coach.conversation, conversation),
  });
}

export function useClearCoachHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: coachService.clearHistory,
    onSuccess: () =>
      queryClient.setQueryData(QUERY_KEYS.coach.conversation, { conversation_id: null, messages: [] }),
  });
}

export function useConfirmCoachAction() {
  const invalidateDomains = useInvalidateCoachDomains();
  return useMutation({
    mutationFn: (proposalId: string) => coachService.confirm(proposalId),
    onSuccess: (result) => invalidateDomains(result.invalidate),
  });
}

export function useCancelCoachAction() {
  return useMutation({ mutationFn: (proposalId: string) => coachService.cancel(proposalId) });
}

export function useMenuAdvice() {
  return useMutation({ mutationFn: (request: MenuAdviceRequest) => coachService.menuAdvice(request) });
}
