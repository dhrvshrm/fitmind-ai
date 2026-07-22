import type { AppNotification } from './notification';

/** Chat types for the AI coach WebSocket feature. */

export type ChatRole = 'user' | 'assistant';

export type MessageStatus = 'streaming' | 'done' | 'error';

/** A single chat bubble, either the user's or the assistant's. */
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  status: MessageStatus;
  timestamp: string;
};

/** Frames the client sends over `/ws/{user_id}`. */
export type ClientFrame =
  | { type: 'message'; content: string }
  | { type: 'ping' };

/**
 * Frames the server sends back. `start`/`token`/`done`/`error` come from
 * `chat_handler`; `pong` answers a keepalive ping; `notification` is pushed
 * live (or on reconnect, for anything missed while offline) by
 * `notification_service.create_notification` / `deliver_pending`.
 */
export type ServerFrame =
  | { type: 'start' }
  | { type: 'token'; content: string }
  | { type: 'done'; content: string }
  | { type: 'error'; content: string }
  | { type: 'pong' }
  | { type: 'notification'; data: AppNotification };

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';
