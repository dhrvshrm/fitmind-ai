import { apiClient } from '../lib/apiClient';
import { ACTIVITY_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  ActivitySettings,
  ActivitySettingsUpdate,
  DeskRoutine,
  StepsSummary,
} from '../types/activity';

/** Steps, activity settings and desk routines. Unwraps the `{ success, message, data }` envelope. */
export const activityService = {
  async getSteps(days: number): Promise<StepsSummary> {
    const { data } = await apiClient.get<ApiEnvelope<StepsSummary>>(ACTIVITY_ENDPOINTS.STEPS, {
      params: { days },
    });
    return data.data;
  },

  async logSteps(date: string, steps: number): Promise<StepsSummary> {
    const { data } = await apiClient.put<ApiEnvelope<{ summary: StepsSummary }>>(
      ACTIVITY_ENDPOINTS.stepsDay(date),
      { steps },
    );
    return data.data.summary;
  },

  async deleteSteps(date: string): Promise<StepsSummary> {
    const { data } = await apiClient.delete<ApiEnvelope<{ summary: StepsSummary }>>(
      ACTIVITY_ENDPOINTS.stepsDay(date),
    );
    return data.data.summary;
  },

  async getSettings(): Promise<ActivitySettings> {
    const { data } = await apiClient.get<ApiEnvelope<ActivitySettings>>(ACTIVITY_ENDPOINTS.SETTINGS);
    return data.data;
  },

  async updateSettings(update: ActivitySettingsUpdate): Promise<ActivitySettings> {
    const { data } = await apiClient.put<ApiEnvelope<ActivitySettings>>(ACTIVITY_ENDPOINTS.SETTINGS, update);
    return data.data;
  },

  async getRoutines(): Promise<DeskRoutine[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ routines: DeskRoutine[] }>>(ACTIVITY_ENDPOINTS.ROUTINES);
    return data.data.routines;
  },
};
