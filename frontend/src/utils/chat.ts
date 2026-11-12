import { CHAT_HISTORY_KEY_PREFIX } from '../constants/api';
import type { ChatMessage, ServerFrame } from '../types/chat';
import type { StoredCoachMessage } from '../types/coach';

/** True for the server frame that confirms the socket is authenticated. */
export function isReadyFrame(frame: ServerFrame): boolean {
  return frame.type === 'ready';
}

/**
 * Chat history now lives on the server. Older versions kept a copy in
 * localStorage; remove it so health chat doesn't linger on the device.
 */
export function clearLegacyChatHistory(userId: string): void {
  try {
    localStorage.removeItem(`${CHAT_HISTORY_KEY_PREFIX}${userId}`);
  } catch {
    // Storage can be unavailable (private mode); nothing to clear then.
  }
}

/** A stored server message as a chat bubble. */
export function toChatMessage(message: StoredCoachMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    status: 'done',
    timestamp: message.created_at,
    kind: message.kind,
    proposals: message.proposals,
  };
}

/** Message id generator, with a fallback for non-secure contexts lacking `crypto.randomUUID`. */
export function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
