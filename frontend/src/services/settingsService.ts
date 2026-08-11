import { apiClient } from "../lib/apiClient";
import { SETTINGS_ENDPOINTS, USER_ENDPOINTS } from "../constants/api";
import type { ApiEnvelope } from "../types/auth";
import type {
  ChangePasswordPayload,
  FullUserProfile,
  NotificationPreferences,
  ProfileUpdatePayload,
} from "../types/settings";

/**
 * Settings + profile API. Each call unwraps the backend
 * `{ success, message, data }` envelope and returns just `data`.
 */
export const settingsService = {
  /** Full current profile (reads the shared `/users/profile` endpoint). */
  async getProfile(): Promise<FullUserProfile> {
    const { data } = await apiClient.get<ApiEnvelope<FullUserProfile>>(
      USER_ENDPOINTS.PROFILE,
    );
    return data.data;
  },

  async updateProfile(payload: ProfileUpdatePayload): Promise<FullUserProfile> {
    const { data } = await apiClient.put<ApiEnvelope<FullUserProfile>>(
      SETTINGS_ENDPOINTS.PROFILE,
      payload,
    );
    return data.data;
  },

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const { data } = await apiClient.get<
      ApiEnvelope<{ preferences: NotificationPreferences }>
    >(SETTINGS_ENDPOINTS.NOTIFICATIONS);
    return data.data.preferences;
  },

  async updateNotificationPreferences(
    changes: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const { data } = await apiClient.put<
      ApiEnvelope<{ preferences: NotificationPreferences }>
    >(SETTINGS_ENDPOINTS.NOTIFICATIONS, changes);
    return data.data.preferences;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post<ApiEnvelope<null>>(
      SETTINGS_ENDPOINTS.CHANGE_PASSWORD,
      payload,
    );
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete<ApiEnvelope<null>>(SETTINGS_ENDPOINTS.ACCOUNT);
  },
};
