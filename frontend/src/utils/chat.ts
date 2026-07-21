import { CHAT_HISTORY_KEY_PREFIX } from '../constants/api';
import type { ChatMessage } from '../types/chat';

/** Caps how much history is kept per user, so localStorage doesn't grow unbounded. */
const MAX_STORED_MESSAGES = 200;

function historyKey(userId: string): string {
  return `${CHAT_HISTORY_KEY_PREFIX}${userId}`;
}

/** Loads a user's persisted chat history, oldest first. */
export function loadChatHistory(userId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/** Persists a user's chat history, trimmed to the most recent messages. */
export function saveChatHistory(userId: string, messages: ChatMessage[]): void {
  const trimmed = messages.slice(-MAX_STORED_MESSAGES);
  localStorage.setItem(historyKey(userId), JSON.stringify(trimmed));
}

/** Message id generator, with a fallback for non-secure contexts lacking `crypto.randomUUID`. */
export function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
