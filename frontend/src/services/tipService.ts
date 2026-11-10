import { apiClient } from '../lib/apiClient';
import { TIP_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { DailyTip } from '../types/tip';

/** Tip of the day API. Unwraps the backend `{ success, message, data }` envelope. */
export const tipService = {
  async today(): Promise<DailyTip> {
    const { data } = await apiClient.get<ApiEnvelope<DailyTip>>(TIP_ENDPOINTS.TODAY);
    return data.data;
  },
};
