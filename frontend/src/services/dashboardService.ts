import { apiClient } from "../lib/apiClient";
import { DASHBOARD_ENDPOINTS } from "../constants/api";
import type { ApiEnvelope } from "../types/auth";
import type {
  DashboardSummary,
  MoodPerformanceResult,
  RecoveryTrendResult,
  WeightTrendResult,
  WorkoutRateResult,
  XpWeeklyResult,
} from "../types/dashboard";

/** Dashboard API. Unwraps the backend `{ success, message, data }` envelope. */
export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const { data } = await apiClient.get<ApiEnvelope<DashboardSummary>>(
      DASHBOARD_ENDPOINTS.SUMMARY,
    );
    return data.data;
  },

  /** Average daily mood/energy over the last 30 days. */
  async getMoodPerformance(): Promise<MoodPerformanceResult> {
    const { data } = await apiClient.get<ApiEnvelope<MoodPerformanceResult>>(
      DASHBOARD_ENDPOINTS.MOOD_PERFORMANCE,
    );
    return data.data;
  },

  /** Body-weight log entries over the last 90 days. */
  async getWeightTrend(): Promise<WeightTrendResult> {
    const { data } = await apiClient.get<ApiEnvelope<WeightTrendResult>>(
      DASHBOARD_ENDPOINTS.WEIGHT_TREND,
    );
    return data.data;
  },

  /** Daily workout counts (zero-filled) over the last 30 days. */
  async getWorkoutRate(): Promise<WorkoutRateResult> {
    const { data } = await apiClient.get<ApiEnvelope<WorkoutRateResult>>(
      DASHBOARD_ENDPOINTS.WORKOUT_RATE,
    );
    return data.data;
  },

  /** XP earned per day over the last 7 days. */
  async getXpWeekly(): Promise<XpWeeklyResult> {
    const { data } = await apiClient.get<ApiEnvelope<XpWeeklyResult>>(
      DASHBOARD_ENDPOINTS.XP_WEEKLY,
    );
    return data.data;
  },

  /** Recovery scores over the last 14 days. */
  async getRecoveryTrend(): Promise<RecoveryTrendResult> {
    const { data } = await apiClient.get<ApiEnvelope<RecoveryTrendResult>>(
      DASHBOARD_ENDPOINTS.RECOVERY_TREND,
    );
    return data.data;
  },
};
