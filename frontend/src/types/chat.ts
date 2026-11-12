import type { AppNotification } from './notification';
import type { CoachDomain, CoachMessageKind, CoachProposal } from './coach';

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
  kind?: CoachMessageKind;
  /** Confirm cards attached to an assistant reply. */
  proposals?: CoachProposal[];
};

/** Frames the client sends over `/ws`. The first frame must be `auth`. */
export type ClientFrame =
  | { type: 'auth'; token: string }
  | { type: 'message'; content: string }
  | { type: 'ping' };

/**
 * Frames the server sends back. `ready` confirms authentication;
 * `start`/`token`/`done`/`error` come from the coach (`chat_handler`), and
 * `done` carries the stored message id and any confirm cards; `invalidate`
 * follows a confirmed action; `pong` answers a keepalive ping;
 * `notification` is pushed live (or on reconnect, for anything missed while
 * offline).
 */
export type ServerFrame =
  | { type: 'ready' }
  | { type: 'start'; user_message_id?: string }
  | { type: 'token'; content: string }
  | {
      type: 'done';
      content: string;
      message_id?: string;
      conversation_id?: string;
      proposals?: CoachProposal[];
    }
  | { type: 'error'; content: string }
  | { type: 'invalidate'; domains: CoachDomain[] }
  | { type: 'pong' }
  | { type: 'notification'; data: AppNotification };

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';
