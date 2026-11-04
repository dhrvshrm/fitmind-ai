import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { settingsService } from '../../services/settingsService';
import { userService } from '../../services/userService';
import type {
  ChangePasswordPayload,
  NotificationPreferences,
  ProfileUpdatePayload,
} from '../../types/settings';
import { useInvalidate } from './queryHelpers';

export function useSettingsProfile() {
  return useQuery({ queryKey: QUERY_KEYS.profile.settings, queryFn: settingsService.getProfile });
}

export function useUserProfile() {
  return useQuery({ queryKey: QUERY_KEYS.profile.user, queryFn: userService.getUserProfile });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: QUERY_KEYS.profile.notificationPreferences,
    // Wrapped: the service method reads `this`, so it can't be passed unbound.
    queryFn: () => settingsService.getNotificationPreferences(),
  });
}

/**
 * Toggles notification preferences optimistically: the switch flips at once
 * and reverts if the request fails.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const key = QUERY_KEYS.profile.notificationPreferences;
  return useMutation({
    mutationFn: (changes: Partial<NotificationPreferences>) =>
      settingsService.updateNotificationPreferences(changes),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      if (previous) queryClient.setQueryData<NotificationPreferences>(key, { ...previous, ...changes });
      return { previous };
    },
    onError: (_error, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (preferences) => queryClient.setQueryData(key, preferences),
  });
}

/** Profile edits change targets (TDEE) and weight trends, so those refresh too. */
export function useUpdateProfile() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => settingsService.updateProfile(payload),
    onSuccess: () =>
      invalidate(QUERY_KEYS.profile.all, QUERY_KEYS.nutrition.all, QUERY_KEYS.dashboard.all),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => settingsService.changePassword(payload),
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: settingsService.deleteAccount });
}
