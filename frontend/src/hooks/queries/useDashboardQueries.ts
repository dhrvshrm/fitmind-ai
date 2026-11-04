import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { dashboardService } from '../../services/dashboardService';

export function useDashboardSummary() {
  return useQuery({ queryKey: QUERY_KEYS.dashboard.summary, queryFn: dashboardService.getSummary });
}

export function useMoodPerformance() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.moodPerformance,
    queryFn: dashboardService.getMoodPerformance,
  });
}

export function useWeightTrend() {
  return useQuery({ queryKey: QUERY_KEYS.dashboard.weightTrend, queryFn: dashboardService.getWeightTrend });
}

export function useWorkoutRate() {
  return useQuery({ queryKey: QUERY_KEYS.dashboard.workoutRate, queryFn: dashboardService.getWorkoutRate });
}

export function useXpWeekly() {
  return useQuery({ queryKey: QUERY_KEYS.dashboard.xpWeekly, queryFn: dashboardService.getXpWeekly });
}

export function useRecoveryTrend() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard.recoveryTrend,
    queryFn: dashboardService.getRecoveryTrend,
  });
}
