import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { gamificationService } from '../../services/gamificationService';

export function useGamificationProfile() {
  return useQuery({ queryKey: QUERY_KEYS.gamification.profile, queryFn: gamificationService.getProfile });
}

export function useBadges() {
  return useQuery({ queryKey: QUERY_KEYS.gamification.badges, queryFn: gamificationService.getBadges });
}
