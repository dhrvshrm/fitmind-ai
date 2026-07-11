import { apiClient } from '../lib/apiClient';
import { RECOVERY_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  RecoveryHistoryItem,
  RecoveryLogPayload,
  RecoveryLogResult,
  RecoveryScoreData,
} from '../types/recovery';

/** Recovery API. Unwraps the backend `{ success, message, data }` envelope. */
export const recoveryService = {
  async logRecovery(payload: RecoveryLogPayload): Promise<RecoveryLogResult> {
    const { data } = await apiClient.post<ApiEnvelope<RecoveryLogResult>>(
      RECOVERY_ENDPOINTS.LOG,
      payload,
    );
    return data.data;
  },

  async getRecoveryScore(): Promise<RecoveryScoreData> {
    const { data } = await apiClient.get<ApiEnvelope<RecoveryScoreData>>(
      RECOVERY_ENDPOINTS.SCORE_TODAY,
    );
    return data.data;
  },

  /** History comes back newest-first from the API. */
  async getRecoveryHistory(days = 14): Promise<RecoveryHistoryItem[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ history: RecoveryHistoryItem[] }>>(
      RECOVERY_ENDPOINTS.HISTORY,
      { params: { days } },
    );
    return data.data.history;
  },
};
