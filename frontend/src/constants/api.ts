/** Backend base URL (from Vite env) and versioned endpoint paths. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const API_PREFIX = '/api/v1';

export const AUTH_ENDPOINTS = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  ME: '/auth/me',
} as const;

export const USER_ENDPOINTS = {
  ONBOARDING: '/users/onboarding',
  PROFILE: '/users/profile',
} as const;

export const DASHBOARD_ENDPOINTS = {
  SUMMARY: '/dashboard/summary',
} as const;

export const RECOVERY_ENDPOINTS = {
  LOG: '/recovery/log',
  SCORE_TODAY: '/recovery/score/today',
  HISTORY: '/recovery/history',
} as const;

export const CHECKIN_ENDPOINTS = {
  VOICE: '/checkin/voice',
  HISTORY: '/checkin/history',
} as const;

export const WORKOUT_ENDPOINTS = {
  GENERATE: '/workouts/generate',
  WEEKLY_PLAN: '/workouts/plan/week',
  TODAY: '/workouts/plan/today',
  LOG: '/workouts/log',
  HISTORY: '/workouts/history',
  EXERCISE_COMPLETE: '/workouts/exercise/complete',
} as const;

/** localStorage key for locally-tracked workout completions (until Day 8 sync). */
export const WORKOUT_COMPLETIONS_KEY = 'fitmind-workout-completions';

export const NUTRITION_ENDPOINTS = {
  MEAL: '/nutrition/meal',
  TODAY: '/nutrition/today',
  HISTORY: '/nutrition/history',
  WATER: '/nutrition/water',
} as const;

export const GAMIFICATION_ENDPOINTS = {
  PROFILE: '/gamification/profile',
  XP: '/gamification/xp',
  BADGES: '/gamification/badges',
} as const;

/** localStorage key mapping badge id -> ISO date first observed as earned. */
export const BADGE_EARNED_DATES_KEY = 'fitmind-badge-earned-dates';

/** localStorage key under which the Zustand auth store is persisted. */
export const AUTH_STORAGE_KEY = 'fitmind-auth';

/**
 * The chat WebSocket (`/ws/{user_id}`) is mounted at the app root, not under
 * `API_PREFIX`, so its URL is derived from `API_BASE_URL` directly and the
 * http(s) scheme is swapped for ws(s).
 */
export function getChatSocketUrl(userId: string): string {
  const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
  const host = API_BASE_URL.replace(/^https?:\/\//, '');
  return `${wsProtocol}://${host}/ws/${encodeURIComponent(userId)}`;
}

/** localStorage key prefix for a user's persisted coach chat history. */
export const CHAT_HISTORY_KEY_PREFIX = 'fitmind-chat-history-';
