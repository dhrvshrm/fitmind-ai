import { apiClient } from '../lib/apiClient';
import { CHALLENGE_ENDPOINTS, PROGRESS_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  AdaptiveStatus,
  Challenge,
  ChallengesResult,
  DayTarget,
  FlexibleDay,
  FlexibleDayInput,
  FlexibleWeek,
  MeasurementInput,
  Measurements,
  PatternsResult,
  ProgressPhoto,
  ProgressPhotos,
  WeekStats,
  WeeklyInsight,
  WeightLogInput,
  WeightTrend,
} from '../types/progress';

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const { data } = await apiClient.get<ApiEnvelope<T>>(url, { params });
  return data.data;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<ApiEnvelope<T>>(url, body);
  return data.data;
}

/** Progress API (Phase 10). Unwraps the backend `{ success, message, data }` envelope. */
export const progressService = {
  getWeight: () => get<WeightTrend>(PROGRESS_ENDPOINTS.WEIGHT),
  logWeight: (input: WeightLogInput) => post<{ date: string; weight_kg: number }>(PROGRESS_ENDPOINTS.WEIGHT, input),

  getMeasurements: () => get<Measurements>(PROGRESS_ENDPOINTS.MEASUREMENTS),
  logMeasurement: (input: MeasurementInput) => post<unknown>(PROGRESS_ENDPOINTS.MEASUREMENTS, input),

  getAdaptive: () => get<AdaptiveStatus>(PROGRESS_ENDPOINTS.ADAPTIVE),
  acceptAdaptive: (calories: number) => post<unknown>(PROGRESS_ENDPOINTS.ADAPTIVE_ACCEPT, { calories }),
  dismissAdaptive: () => post<unknown>(PROGRESS_ENDPOINTS.ADAPTIVE_DISMISS),

  getPatterns: () => get<PatternsResult>(PROGRESS_ENDPOINTS.PATTERNS),
  getWeeklyInsight: () => get<WeeklyInsight>(PROGRESS_ENDPOINTS.WEEKLY_INSIGHT),
  getWeekSummary: () => get<WeekStats>(PROGRESS_ENDPOINTS.WEEK_SUMMARY),

  getFlexibleWeek: () => get<FlexibleWeek>(PROGRESS_ENDPOINTS.FLEXIBLE_DAYS),
  markFlexibleDay: (input: FlexibleDayInput) => post<FlexibleDay>(PROGRESS_ENDPOINTS.FLEXIBLE_DAYS, input),
  async unmarkFlexibleDay(date: string): Promise<void> {
    await apiClient.delete(PROGRESS_ENDPOINTS.flexibleDay(date));
  },
  /** Targets for one date after flexible days; usable by Today and nutrition screens. */
  getEffectiveTarget: (date: string) => get<DayTarget | null>(PROGRESS_ENDPOINTS.EFFECTIVE_TARGET, { date }),

  getPhotos: () => get<ProgressPhotos>(PROGRESS_ENDPOINTS.PHOTOS),
  async uploadPhoto(file: File, date?: string): Promise<ProgressPhoto> {
    const form = new FormData();
    form.append('photo', file, file.name);
    if (date) form.append('date', date);
    const { data } = await apiClient.post<ApiEnvelope<ProgressPhoto>>(PROGRESS_ENDPOINTS.PHOTOS, form, {
      // Let the browser set the multipart boundary itself.
      headers: { 'Content-Type': undefined as unknown as string },
    });
    return data.data;
  },
  async deletePhoto(id: string): Promise<void> {
    await apiClient.delete(PROGRESS_ENDPOINTS.photo(id));
  },

  getChallenges: () => get<ChallengesResult>(CHALLENGE_ENDPOINTS.LIST),
  createChallenge: (friendId: string, kind: string) =>
    post<Challenge>(CHALLENGE_ENDPOINTS.LIST, { friend_id: friendId, kind }),
  acceptChallenge: (id: string) => post<Challenge>(CHALLENGE_ENDPOINTS.accept(id)),
  async declineChallenge(id: string): Promise<void> {
    await apiClient.post(CHALLENGE_ENDPOINTS.decline(id));
  },
};
