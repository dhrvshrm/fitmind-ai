import { apiClient } from "../lib/apiClient";
import { SETTINGS_ENDPOINTS } from "../constants/api";
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
  /** Full current profile, including notification preferences. */
  async getProfile(): Promise<FullUserProfile> {
    const { data } = await apiClient.get<ApiEnvelope<FullUserProfile>>(
      SETTINGS_ENDPOINTS.PROFILE,
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

  /** Preferences live on the profile; read them from there. */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const profile = await this.getProfile();
    return profile.notification_preferences;
  },

  async updateNotificationPreferences(
    changes: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const { data } = await apiClient.put<
      ApiEnvelope<{ preferences: NotificationPreferences }>
    >(SETTINGS_ENDPOINTS.PREFERENCES, changes);
    return data.data.preferences;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.put<ApiEnvelope<null>>(
      SETTINGS_ENDPOINTS.PASSWORD,
      payload,
    );
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete<ApiEnvelope<null>>(SETTINGS_ENDPOINTS.ACCOUNT);
  },
};
