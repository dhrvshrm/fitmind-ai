import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { STEP_HISTORY_DAYS } from '../../constants/activity';
import { activityService } from '../../services/activityService';
import { foodScanService } from '../../services/foodScanService';
import type { ActivitySettingsUpdate } from '../../types/activity';
import { useInvalidate } from './queryHelpers';

export function useSteps(days: number = STEP_HISTORY_DAYS) {
  return useQuery({
    queryKey: QUERY_KEYS.activity.steps(days),
    queryFn: () => activityService.getSteps(days),
  });
}

/**
 * Steps can change the activity level behind the calorie targets, so saving
 * them refreshes targets, nutrition goals and the dashboard as well.
 */
function useStepsInvalidation() {
  const invalidate = useInvalidate();
  return () =>
    invalidate(
      QUERY_KEYS.activity.all,
      QUERY_KEYS.profile.all,
      QUERY_KEYS.nutrition.all,
      QUERY_KEYS.dashboard.all,
    );
}

export function useLogSteps() {
  const onSuccess = useStepsInvalidation();
  return useMutation({
    mutationFn: ({ date, steps }: { date: string; steps: number }) => activityService.logSteps(date, steps),
    onSuccess,
  });
}

export function useDeleteSteps() {
  const onSuccess = useStepsInvalidation();
  return useMutation({
    mutationFn: (date: string) => activityService.deleteSteps(date),
    onSuccess,
  });
}

export function useActivitySettings(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.activity.settings,
    queryFn: activityService.getSettings,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateActivitySettings() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (update: ActivitySettingsUpdate) => activityService.updateSettings(update),
    onSuccess: () => invalidate(QUERY_KEYS.activity.all),
  });
}

export function useDeskRoutines() {
  return useQuery({
    queryKey: QUERY_KEYS.activity.routines,
    queryFn: activityService.getRoutines,
    staleTime: 30 * 60_000,
  });
}

/** Barcode lookup; results are cached server-side, nothing is logged. */
export function useBarcodeLookup() {
  return useMutation({ mutationFn: (code: string) => foodScanService.lookupBarcode(code) });
}

/** Meal photo -> estimate for review. The photo isn't stored. */
export function usePhotoEstimate() {
  return useMutation({
    mutationFn: ({ image, filename }: { image: Blob; filename: string }) =>
      foodScanService.estimatePhoto(image, filename),
  });
}
