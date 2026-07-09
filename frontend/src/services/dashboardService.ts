import { apiClient } from '../lib/apiClient';
import { DASHBOARD_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { DashboardSummary } from '../types/dashboard';

/** Dashboard API. Unwraps the backend `{ success, message, data }` envelope. */
export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const { data } = await apiClient.get<ApiEnvelope<DashboardSummary>>(
      DASHBOARD_ENDPOINTS.SUMMARY,
    );
    return data.data;
  },
};
