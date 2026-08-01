import { apiClient } from "../lib/apiClient";
import { REPORT_ENDPOINTS } from "../constants/api";
import type { ApiEnvelope } from "../types/auth";
import type { WeeklyReport } from "../types/report";

/** Weekly reports API. Unwraps the backend `{ success, message, data }` envelope. */
export const reportService = {
  /** All of the user's past reports, newest first. */
  async getHistory(): Promise<WeeklyReport[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ reports: WeeklyReport[] }>>(
      REPORT_ENDPOINTS.HISTORY,
    );
    return data.data.reports;
  },

  async getLatest(): Promise<WeeklyReport | null> {
    const { data } = await apiClient.get<ApiEnvelope<{ report: WeeklyReport | null }>>(
      REPORT_ENDPOINTS.LATEST,
    );
    return data.data.report;
  },

  /** Generates a report for the current week on demand. */
  async generate(): Promise<WeeklyReport> {
    const { data } = await apiClient.post<ApiEnvelope<{ report: WeeklyReport }>>(
      REPORT_ENDPOINTS.GENERATE,
    );
    return data.data.report;
  },

  async getById(id: string): Promise<WeeklyReport> {
    const { data } = await apiClient.get<ApiEnvelope<{ report: WeeklyReport }>>(
      REPORT_ENDPOINTS.byId(id),
    );
    return data.data.report;
  },
};
