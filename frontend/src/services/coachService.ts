import { apiClient } from '../lib/apiClient';
import { COACH_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type {
  CancelActionResult,
  CoachConversation,
  ConfirmActionResult,
  MenuAdvice,
  MenuAdviceRequest,
} from '../types/coach';

/** Coach API: stored chat, confirm cards and menu advice. Unwraps the `{ success, message, data }` envelope. */
export const coachService = {
  async getConversation(): Promise<CoachConversation> {
    const { data } = await apiClient.get<ApiEnvelope<CoachConversation>>(COACH_ENDPOINTS.CONVERSATION);
    return data.data;
  },

  async newConversation(): Promise<CoachConversation> {
    const { data } = await apiClient.post<ApiEnvelope<CoachConversation>>(COACH_ENDPOINTS.CONVERSATION);
    return data.data;
  },

  async clearHistory(): Promise<void> {
    await apiClient.delete(COACH_ENDPOINTS.HISTORY);
  },

  async confirm(proposalId: string): Promise<ConfirmActionResult> {
    const { data } = await apiClient.post<ApiEnvelope<ConfirmActionResult>>(
      COACH_ENDPOINTS.confirm(proposalId),
    );
    return data.data;
  },

  async cancel(proposalId: string): Promise<CancelActionResult> {
    const { data } = await apiClient.post<ApiEnvelope<CancelActionResult>>(
      COACH_ENDPOINTS.cancel(proposalId),
    );
    return data.data;
  },

  async menuAdvice({ text, image }: MenuAdviceRequest): Promise<MenuAdvice> {
    const form = new FormData();
    if (text.trim()) form.append('text', text.trim());
    if (image) form.append('image', image, image.name);
    const { data } = await apiClient.post<ApiEnvelope<MenuAdvice>>(
      COACH_ENDPOINTS.MENU,
      form,
      // Let the browser set the multipart boundary itself.
      { headers: { 'Content-Type': undefined as unknown as string } },
    );
    return data.data;
  },
};
