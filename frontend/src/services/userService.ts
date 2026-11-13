import { apiClient } from '../lib/apiClient';
import { USER_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { ShiftTimesPayload } from '../types/indiaFirst';
import type {
  OnboardingPayload,
  OnboardingResultData,
  Targets,
  UserProfile,
} from '../types/onboarding';

/** Inputs for previewing targets before onboarding answers are saved. */
export type TargetsPreviewPayload = Pick<
  OnboardingPayload,
  | 'age'
  | 'gender'
  | 'weight_kg'
  | 'height_cm'
  | 'fitness_goal'
  | 'activity_level'
  | 'goal_pace'
  | 'body_fat_percent'
  | 'reproductive_status'
  | 'workout_days_per_week'
>;

/**
 * User profile + onboarding API. Each call unwraps the backend
 * `{ success, message, data }` envelope and returns just `data`.
 */
export const userService = {
  /** Saves onboarding answers and returns the computed targets. Safe to repeat to update answers. */
  async completeOnboarding(payload: OnboardingPayload): Promise<OnboardingResultData> {
    const { data } = await apiClient.post<ApiEnvelope<OnboardingResultData>>(
      USER_ENDPOINTS.ONBOARDING,
      payload,
    );
    return data.data;
  },

  async getUserProfile(): Promise<UserProfile> {
    const { data } = await apiClient.get<ApiEnvelope<UserProfile>>(
      USER_ENDPOINTS.PROFILE,
    );
    return data.data;
  },

  /** Current daily targets, or null until age, sex, height and weight are known. */
  async getTargets(): Promise<Targets | null> {
    const { data } = await apiClient.get<ApiEnvelope<{ targets: Targets | null }>>(
      USER_ENDPOINTS.TARGETS,
    );
    return data.data.targets;
  },

  /** Targets for unsaved answers; nothing is stored. */
  async previewTargets(payload: TargetsPreviewPayload): Promise<Targets> {
    const { data } = await apiClient.post<ApiEnvelope<{ targets: Targets }>>(
      USER_ENDPOINTS.TARGETS_PREVIEW,
      payload,
    );
    return data.data.targets;
  },

  /** Changes only the sections sent (here, wake and sleep times and work pattern); targets are recomputed. */
  async updatePersonalisation(payload: ShiftTimesPayload): Promise<UserProfile> {
    const { data } = await apiClient.put<ApiEnvelope<UserProfile>>(USER_ENDPOINTS.PERSONALISATION, payload);
    return data.data;
  },
};
