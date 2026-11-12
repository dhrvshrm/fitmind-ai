import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { progressService } from '../../services/progressService';
import type { FlexibleDayInput, MeasurementInput, WeightLogInput } from '../../types/progress';
import { useInvalidate } from './queryHelpers';

const K = QUERY_KEYS.progress;

export function useWeightProgress() {
  return useQuery({ queryKey: K.weight, queryFn: progressService.getWeight });
}

export function useMeasurements() {
  return useQuery({ queryKey: K.measurements, queryFn: progressService.getMeasurements });
}

export function useAdaptiveTarget() {
  return useQuery({ queryKey: K.adaptive, queryFn: progressService.getAdaptive });
}

export function usePatterns() {
  return useQuery({ queryKey: K.patterns, queryFn: progressService.getPatterns, staleTime: 10 * 60 * 1000 });
}

export function useWeeklyInsight() {
  return useQuery({ queryKey: K.insight, queryFn: progressService.getWeeklyInsight, staleTime: 60 * 60 * 1000 });
}

export function useWeekSummary() {
  return useQuery({ queryKey: K.weekSummary, queryFn: progressService.getWeekSummary });
}

export function useFlexibleWeek() {
  return useQuery({ queryKey: K.flexibleWeek, queryFn: progressService.getFlexibleWeek });
}

/** Targets for a date after flexible days and rebalancing (for Today and nutrition screens). */
export function useEffectiveTarget(date: string) {
  return useQuery({ queryKey: K.effectiveTarget(date), queryFn: () => progressService.getEffectiveTarget(date) });
}

export function useProgressPhotos() {
  return useQuery({
    queryKey: K.photos,
    queryFn: progressService.getPhotos,
    // Signed URLs expire after a few minutes, so refresh before they do.
    staleTime: 4 * 60 * 1000,
    refetchInterval: 8 * 60 * 1000,
  });
}

export function useChallenges() {
  return useQuery({ queryKey: K.challenges, queryFn: progressService.getChallenges });
}

export function useLogWeight() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: WeightLogInput) => progressService.logWeight(input),
    onSuccess: () => invalidate(K.weight, K.weekSummary, K.adaptive, QUERY_KEYS.dashboard.all),
  });
}

export function useLogMeasurement() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: MeasurementInput) => progressService.logMeasurement(input),
    onSuccess: () => invalidate(K.measurements, K.weekSummary),
  });
}

export function useAcceptAdaptiveTarget() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (calories: number) => progressService.acceptAdaptive(calories),
    onSuccess: () => invalidate(K.all, QUERY_KEYS.profile.all, QUERY_KEYS.nutrition.all),
  });
}

export function useDismissAdaptiveTarget() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => progressService.dismissAdaptive(),
    onSuccess: () => invalidate(K.adaptive),
  });
}

export function useMarkFlexibleDay() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: FlexibleDayInput) => progressService.markFlexibleDay(input),
    onSuccess: () => invalidate(K.all, QUERY_KEYS.nutrition.all),
  });
}

export function useUnmarkFlexibleDay() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (date: string) => progressService.unmarkFlexibleDay(date),
    onSuccess: () => invalidate(K.all, QUERY_KEYS.nutrition.all),
  });
}

export function useUploadPhoto() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (file: File) => progressService.uploadPhoto(file),
    onSuccess: () => invalidate(K.photos),
  });
}

export function useDeletePhoto() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => progressService.deletePhoto(id),
    onSuccess: () => invalidate(K.photos),
  });
}

export function useCreateChallenge() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ friendId, kind }: { friendId: string; kind: string }) =>
      progressService.createChallenge(friendId, kind),
    onSuccess: () => invalidate(K.challenges),
  });
}

export function useAcceptChallenge() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => progressService.acceptChallenge(id),
    onSuccess: () => invalidate(K.challenges),
  });
}

export function useDeclineChallenge() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => progressService.declineChallenge(id),
    onSuccess: () => invalidate(K.challenges),
  });
}
