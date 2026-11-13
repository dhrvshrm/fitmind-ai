import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { workoutService } from '../../services/workoutService';
import type {
  GeneratePlanPayload,
  QuickSessionPayload,
  TodayWorkout,
  WorkoutLogPayload,
} from '../../types/workout';
import { useInvalidate } from './queryHelpers';

export function useWeeklyPlan() {
  return useQuery({ queryKey: QUERY_KEYS.workouts.plan, queryFn: workoutService.getWeeklyPlan });
}

export function useTodayWorkout() {
  return useQuery({ queryKey: QUERY_KEYS.workouts.today, queryFn: workoutService.getTodayWorkout });
}

export function useWorkoutHistory(days = 30) {
  return useQuery({
    queryKey: QUERY_KEYS.workouts.history(days),
    queryFn: () => workoutService.getWorkoutHistory(days),
  });
}

export function useGeneratePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: GeneratePlanPayload = {}) => workoutService.generateWorkoutPlan(payload),
    onSuccess: () => invalidate(QUERY_KEYS.workouts.all),
  });
}

/** Logs a finished workout; refreshes workouts, the dashboard and XP. */
export function useLogWorkout() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: WorkoutLogPayload) => workoutService.logWorkout(payload),
    onSuccess: () =>
      invalidate(QUERY_KEYS.workouts.all, QUERY_KEYS.dashboard.all, QUERY_KEYS.gamification.all),
  });
}

export function useCompleteExercise() {
  return useMutation({
    mutationFn: (exerciseName: string) => workoutService.completeExercise(exerciseName),
  });
}

/** Quick-session changes return today's session; store it instead of refetching. */
function useSetToday() {
  const queryClient = useQueryClient();
  return (today: TodayWorkout) => queryClient.setQueryData(QUERY_KEYS.workouts.today, today);
}

export function useStartQuickSession() {
  const setToday = useSetToday();
  return useMutation({
    mutationFn: (payload: QuickSessionPayload) => workoutService.startQuickSession(payload),
    onSuccess: setToday,
  });
}

export function useEndQuickSession() {
  const setToday = useSetToday();
  return useMutation({ mutationFn: workoutService.endQuickSession, onSuccess: setToday });
}

export function useSwapOptions(day: string, index: number, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.workouts.swapOptions(day, index),
    queryFn: () => workoutService.getSwapOptions(day, index),
    enabled,
  });
}

/** Swapping changes the plan and possibly today's session. */
export function useSwapExercise() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ day, index, exerciseId }: { day: string; index: number; exerciseId: string }) =>
      workoutService.swapExercise(day, index, exerciseId),
    onSuccess: () => invalidate(QUERY_KEYS.workouts.all),
  });
}

/** Easy-week and level suggestions (progressive overload). */
export function useProgression() {
  return useQuery({ queryKey: QUERY_KEYS.workouts.progression, queryFn: workoutService.getProgression });
}

/** Starting or ending an easy week changes today's sets. */
export function useDeload() {
  const invalidate = useInvalidate();
  const onSuccess = () => invalidate(QUERY_KEYS.workouts.all);
  return {
    start: useMutation({ mutationFn: workoutService.startDeload, onSuccess }),
    end: useMutation({ mutationFn: workoutService.endDeload, onSuccess }),
  };
}

export function useSnoozeSuggestion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (kind: 'deload' | 'level') => workoutService.snoozeSuggestion(kind),
    onSuccess: () => invalidate(QUERY_KEYS.workouts.progression),
  });
}

/** A new level rebuilds the plan and changes the profile. */
export function useLevelUp() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: workoutService.levelUp,
    onSuccess: () => invalidate(QUERY_KEYS.workouts.all, QUERY_KEYS.profile.all),
  });
}

export function useStrength() {
  return useQuery({ queryKey: QUERY_KEYS.workouts.strength, queryFn: workoutService.getStrength });
}
