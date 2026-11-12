import { COACH_STRINGS } from './coachStrings';

/** Suggestion chips shown before/alongside the conversation. */
export const QUICK_PROMPTS: readonly string[] = COACH_STRINGS.quickPrompts;

/** Reconnect backoff schedule (ms); the last value repeats once exhausted. */
export const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];

/** Keepalive ping cadence while the socket is open (ms). */
export const PING_INTERVAL_MS = 25000;
