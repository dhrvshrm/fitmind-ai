import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { workoutService } from '../../services/workoutService';
import type { GeneratePlanPayload, WorkoutLogPayload } from '../../types/workout';
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
