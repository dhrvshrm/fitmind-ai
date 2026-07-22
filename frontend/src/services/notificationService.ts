import { apiClient } from '../lib/apiClient';
import { NOTIFICATION_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { NotificationListResult } from '../types/notification';

/** Notification API. Unwraps the backend `{ success, message, data }` envelope. */
export const notificationService = {
  async getNotifications(limit = 50): Promise<NotificationListResult> {
    const { data } = await apiClient.get<ApiEnvelope<NotificationListResult>>(
      NOTIFICATION_ENDPOINTS.LIST,
      { params: { limit } },
    );
    return data.data;
  },

  async markRead(id: string): Promise<void> {
    await apiClient.post(NOTIFICATION_ENDPOINTS.read(id));
  },
};
