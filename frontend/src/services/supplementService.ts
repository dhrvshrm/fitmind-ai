import { apiClient } from '../lib/apiClient';
import { SUPPLEMENT_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  Essentials,
  LabelEstimate,
  SupplementCatalog,
  SupplementRoutine,
  SupplementDay,
  UserSupplement,
  UserSupplementPayload,
  UserSupplementUpdate,
} from '../types/supplements';

/** The supplement catalogue and the user's own list. Unwraps the `{ success, message, data }` envelope. */
export const supplementService = {
  async getCatalog(): Promise<SupplementCatalog> {
    const { data } = await apiClient.get<ApiEnvelope<SupplementCatalog>>(SUPPLEMENT_ENDPOINTS.CATALOG);
    return data.data;
  },

  async getMine(): Promise<UserSupplement[]> {
    const { data } = await apiClient.get<ApiEnvelope<UserSupplement[]>>(SUPPLEMENT_ENDPOINTS.MINE);
    return data.data;
  },

  async add(payload: UserSupplementPayload): Promise<UserSupplement> {
    const { data } = await apiClient.post<ApiEnvelope<UserSupplement>>(SUPPLEMENT_ENDPOINTS.MINE, payload);
    return data.data;
  },

  async update(id: string, changes: UserSupplementUpdate): Promise<UserSupplement> {
    const { data } = await apiClient.patch<ApiEnvelope<UserSupplement>>(SUPPLEMENT_ENDPOINTS.mine(id), changes);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(SUPPLEMENT_ENDPOINTS.mine(id));
  },

  async setTaken(id: string, taken: boolean): Promise<UserSupplement> {
    const url = SUPPLEMENT_ENDPOINTS.taken(id);
    const { data } = taken
      ? await apiClient.post<ApiEnvelope<UserSupplement>>(url)
      : await apiClient.delete<ApiEnvelope<UserSupplement>>(url);
    return data.data;
  },

  async getRoutine(): Promise<SupplementRoutine> {
    const { data } = await apiClient.get<ApiEnvelope<SupplementRoutine>>(SUPPLEMENT_ENDPOINTS.ROUTINE);
    return data.data;
  },

  async getEssentials(budget: number): Promise<Essentials> {
    const { data } = await apiClient.get<ApiEnvelope<Essentials>>(SUPPLEMENT_ENDPOINTS.ESSENTIALS, {
      params: { budget },
    });
    return data.data;
  },

  async estimate(product: string, supplementId?: string | null): Promise<LabelEstimate> {
    const { data } = await apiClient.post<ApiEnvelope<LabelEstimate>>(SUPPLEMENT_ENDPOINTS.ESTIMATE, {
      product,
      supplement_id: supplementId ?? null,
    });
    return data.data;
  },

  async getHistory(days: number): Promise<SupplementDay[]> {
    const { data } = await apiClient.get<ApiEnvelope<SupplementDay[]>>(SUPPLEMENT_ENDPOINTS.HISTORY, {
      params: { days },
    });
    return data.data;
  },
};
