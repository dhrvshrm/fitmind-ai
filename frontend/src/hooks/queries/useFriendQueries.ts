import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { friendService } from '../../services/friendService';
import { useInvalidate } from './queryHelpers';

export function useFriends() {
  return useQuery({ queryKey: QUERY_KEYS.friends.list, queryFn: friendService.getFriends });
}

export function useFriendRequests() {
  return useQuery({ queryKey: QUERY_KEYS.friends.requests, queryFn: friendService.getPendingRequests });
}

export function useLeaderboard() {
  return useQuery({ queryKey: QUERY_KEYS.friends.leaderboard, queryFn: friendService.getLeaderboard });
}

export function useSendFriendRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (username: string) => friendService.sendRequest(username),
    onSuccess: () => invalidate(QUERY_KEYS.friends.all),
  });
}

export function useAcceptFriendRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (requestId: string) => friendService.acceptRequest(requestId),
    onSuccess: () => invalidate(QUERY_KEYS.friends.all),
  });
}

export function useDeclineFriendRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (requestId: string) => friendService.declineRequest(requestId),
    onSuccess: () => invalidate(QUERY_KEYS.friends.requests),
  });
}

export function useNudgeFriend() {
  return useMutation({ mutationFn: (userId: string) => friendService.nudge(userId) });
}
