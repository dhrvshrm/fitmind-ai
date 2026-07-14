import { apiClient } from '../lib/apiClient';
import { CHECKIN_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { VoiceCheckinResult, VoiceHistoryItem } from '../types/voiceCheckin';

/** Multipart field name the backend expects for the audio file. */
const AUDIO_FIELD = 'audio';

/** Voice check-in API. Unwraps the backend `{ success, message, data }` envelope. */
export const voiceService = {
  /** Uploads the recorded audio as multipart form data and returns the analysis. */
  async recordAndAnalyze(audioBlob: Blob): Promise<VoiceCheckinResult> {
    const formData = new FormData();
    const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
    formData.append(AUDIO_FIELD, audioBlob, `checkin.${extension}`);

    const { data } = await apiClient.post<ApiEnvelope<VoiceCheckinResult>>(
      CHECKIN_ENDPOINTS.VOICE,
      formData,
      // Let the browser set the multipart boundary itself.
      { headers: { 'Content-Type': undefined as unknown as string } },
    );
    return data.data;
  },

  /** History comes back newest-first from the API. */
  async getVoiceHistory(limit = 30): Promise<VoiceHistoryItem[]> {
    const { data } = await apiClient.get<ApiEnvelope<{ checkins: VoiceHistoryItem[] }>>(
      CHECKIN_ENDPOINTS.HISTORY,
      { params: { limit } },
    );
    return data.data.checkins;
  },
};
