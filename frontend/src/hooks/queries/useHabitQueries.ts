import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { habitService } from '../../services/habitService';
import { dietPlanService } from '../../services/dietPlanService';
import { subscribeDevice, unsubscribeDevice } from '../../lib/push';
import type { OnboardingPayload } from '../../types/onboarding';
import type { ReminderSettingsUpdate, ReminderState } from '../../types/habit';
import { useInvalidate } from './queryHelpers';

/** How long Today keeps checking for a meal plan that is still being built. */
const PENDING_PLAN_POLL_MS = 4000;

export function useTodayStatus() {
  return useQuery({ queryKey: QUERY_KEYS.today.status, queryFn: habitService.todayStatus });
}

/**
 * The current meal plan. When onboarding said it was still being built
 * (`waiting`), keeps checking until it appears.
 */
export function useTodayDietPlan(waiting: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.dietPlan.current,
    queryFn: dietPlanService.getCurrent,
    refetchInterval: (query) => (waiting && !query.state.data ? PENDING_PLAN_POLL_MS : false),
  });
}

/** First-time onboarding with instant setup; every screen that shows plans or targets refreshes. */
export function useCompleteOnboardingWithSetup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: OnboardingPayload) => habitService.completeOnboardingWithSetup(payload),
    onSuccess: () =>
      invalidate(
        QUERY_KEYS.profile.all,
        QUERY_KEYS.nutrition.all,
        QUERY_KEYS.dashboard.all,
        QUERY_KEYS.dietPlan.all,
        QUERY_KEYS.workouts.all,
        QUERY_KEYS.today.all,
      ),
  });
}

export function useReminders() {
  return useQuery({ queryKey: QUERY_KEYS.reminders.state, queryFn: habitService.getReminders });
}

function useSetReminders() {
  const queryClient = useQueryClient();
  return (state: ReminderState) => {
    queryClient.setQueryData(QUERY_KEYS.reminders.state, state);
    return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.today.status });
  };
}

export function useUpdateReminders() {
  const setReminders = useSetReminders();
  return useMutation({
    mutationFn: (changes: ReminderSettingsUpdate) => habitService.updateReminders(changes),
    onSuccess: setReminders,
  });
}

/** Outcome of asking to turn reminders on for this device. */
export type EnableResult = 'on' | 'denied';

/** Asks the browser for permission, subscribes this device and tells the server. */
export function useEnableReminders() {
  const setReminders = useSetReminders();
  return useMutation({
    mutationFn: async (): Promise<EnableResult> => {
      const state = await habitService.getReminders();
      if (!state.public_key) throw new Error('unavailable');
      const subscription = await subscribeDevice(state.public_key);
      if (!subscription) return 'denied';
      const next = await habitService.subscribe(subscription);
      // Turning a device on also switches reminders on if they were paused.
      await setReminders(next.settings.enabled ? next : await habitService.updateReminders({ enabled: true }));
      return 'on';
    },
  });
}

export function useDisableReminders() {
  const setReminders = useSetReminders();
  return useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeDevice();
      return endpoint ? habitService.unsubscribe(endpoint) : habitService.getReminders();
    },
    onSuccess: setReminders,
  });
}

export function useSendTestReminder() {
  return useMutation({ mutationFn: habitService.sendTest });
}
