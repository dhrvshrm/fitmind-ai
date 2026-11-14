import { apiClient } from '../lib/apiClient';
import { HEALTH_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  ConsentScope,
  ConsentStatus,
  HealthProfilePayload,
  HealthProfileView,
} from '../types/health';

/** Consent and the health profile. Unwraps the `{ success, message, data }` envelope. */
export const healthService = {
  async getConsents(): Promise<ConsentStatus[]> {
    const { data } = await apiClient.get<ApiEnvelope<ConsentStatus[]>>(HEALTH_ENDPOINTS.CONSENTS);
    return data.data;
  },

  async grantConsent(scope: ConsentScope): Promise<ConsentStatus[]> {
    const { data } = await apiClient.post<ApiEnvelope<ConsentStatus[]>>(HEALTH_ENDPOINTS.CONSENTS, { scope });
    return data.data;
  },

  async withdrawConsent(scope: ConsentScope): Promise<ConsentStatus[]> {
    const { data } = await apiClient.delete<ApiEnvelope<{ consents: ConsentStatus[] }>>(
      HEALTH_ENDPOINTS.consent(scope),
    );
    return data.data.consents;
  },

  async getProfile(): Promise<HealthProfileView> {
    const { data } = await apiClient.get<ApiEnvelope<HealthProfileView>>(HEALTH_ENDPOINTS.PROFILE);
    return data.data;
  },

  async saveProfile(payload: HealthProfilePayload): Promise<HealthProfileView> {
    const { data } = await apiClient.put<ApiEnvelope<HealthProfileView>>(HEALTH_ENDPOINTS.PROFILE, payload);
    return data.data;
  },
};
