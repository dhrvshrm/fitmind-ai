import { apiClient } from '../lib/apiClient';
import { GAMIFICATION_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  AwardXpResult,
  BadgesResponse,
  GamificationProfile,
} from '../types/gamification';

/** Gamification API. Unwraps the backend `{ success, message, data }` envelope. */
export const gamificationService = {
  async getProfile(): Promise<GamificationProfile> {
    const { data } = await apiClient.get<ApiEnvelope<GamificationProfile>>(
      GAMIFICATION_ENDPOINTS.PROFILE,
    );
    return data.data;
  },

  /** Earned badges plus the full catalog, so locked badges can be shown too. */
  async getBadges(): Promise<BadgesResponse> {
    const { data } = await apiClient.get<ApiEnvelope<BadgesResponse>>(
      GAMIFICATION_ENDPOINTS.BADGES,
    );
    return data.data;
  },

  async awardXp(amount: number): Promise<AwardXpResult> {
    const { data } = await apiClient.post<ApiEnvelope<AwardXpResult>>(
      GAMIFICATION_ENDPOINTS.XP,
      { amount },
    );
    return data.data;
  },
};
