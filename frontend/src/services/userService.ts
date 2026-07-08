import { apiClient } from '../lib/apiClient';
import { USER_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  OnboardingPayload,
  OnboardingResultData,
  UserProfile,
} from '../types/onboarding';

/**
 * User profile + onboarding API. Each call unwraps the backend
 * `{ success, message, data }` envelope and returns just `data`.
 */
export const userService = {
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

  /**
   * No dedicated update endpoint exists yet, so profile edits reuse the
   * onboarding endpoint (it accepts the same payload).
   */
  async updateProfile(payload: OnboardingPayload): Promise<OnboardingResultData> {
    const { data } = await apiClient.post<ApiEnvelope<OnboardingResultData>>(
      USER_ENDPOINTS.ONBOARDING,
      payload,
    );
    return data.data;
  },
};
