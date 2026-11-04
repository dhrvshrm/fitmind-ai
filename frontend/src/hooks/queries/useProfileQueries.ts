import { useMutation, useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { settingsService } from '../../services/settingsService';
import { userService } from '../../services/userService';
import type { ChangePasswordPayload, ProfileUpdatePayload } from '../../types/settings';
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
    queryFn: settingsService.getNotificationPreferences,
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
