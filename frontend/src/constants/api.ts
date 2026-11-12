/** Backend base URL (from Vite env) and versioned endpoint paths. */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const API_PREFIX = "/api/v1";

export const AUTH_ENDPOINTS = {
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  ME: "/auth/me",
} as const;

export const USER_ENDPOINTS = {
  ONBOARDING: "/users/onboarding",
  PROFILE: "/users/profile",
  TARGETS: "/users/targets",
  TARGETS_PREVIEW: "/users/targets/preview",
} as const;

export const DASHBOARD_ENDPOINTS = {
  SUMMARY: "/dashboard/summary",
  MOOD_PERFORMANCE: "/dashboard/mood-performance",
  WEIGHT_TREND: "/dashboard/weight-trend",
  WORKOUT_RATE: "/dashboard/workout-rate",
  XP_WEEKLY: "/dashboard/xp-weekly",
  RECOVERY_TREND: "/dashboard/recovery-trend",
} as const;

export const RECOVERY_ENDPOINTS = {
  LOG: "/recovery/log",
  SCORE_TODAY: "/recovery/score/today",
  HISTORY: "/recovery/history",
} as const;

export const CHECKIN_ENDPOINTS = {
  VOICE: "/checkin/voice",
  HISTORY: "/checkin/history",
} as const;

export const WORKOUT_ENDPOINTS = {
  GENERATE: "/workouts/generate",
  WEEKLY_PLAN: "/workouts/plan/week",
  TODAY: "/workouts/plan/today",
  LOG: "/workouts/log",
  HISTORY: "/workouts/history",
  EXERCISE_COMPLETE: "/workouts/exercise/complete",
  QUICK: "/workouts/quick",
  alternatives: (day: string, index: number) => `/workouts/plan/${day}/exercises/${index}/alternatives`,
  swap: (day: string, index: number) => `/workouts/plan/${day}/exercises/${index}/swap`,
} as const;

export const EXERCISE_ENDPOINTS = {
  SEARCH: "/exercises",
  detail: (id: string) => `/exercises/${encodeURIComponent(id)}`,
} as const;

/** localStorage key for locally-tracked workout completions (until Day 8 sync). */
export const WORKOUT_COMPLETIONS_KEY = "fitmind-workout-completions";

export const NUTRITION_ENDPOINTS = {
  MEAL: "/nutrition/meal",
  meal: (id: string) => `/nutrition/meal/${encodeURIComponent(id)}`,
  TODAY: "/nutrition/today",
  HISTORY: "/nutrition/history",
  WATER: "/nutrition/water",
  ESTIMATE: "/nutrition/estimate",
  TRANSCRIBE: "/nutrition/transcribe",
  MEALS_BATCH: "/nutrition/meals/batch",
  FOOD_SEARCH: "/nutrition/foods/search",
  food: (id: string) => `/nutrition/foods/${encodeURIComponent(id)}`,
  RECENT: "/nutrition/recent",
  SAVED_MEALS: "/nutrition/saved-meals",
  savedMeal: (id: string) => `/nutrition/saved-meals/${encodeURIComponent(id)}`,
  logSavedMeal: (id: string) => `/nutrition/saved-meals/${encodeURIComponent(id)}/log`,
  MY_FOODS: "/nutrition/my-foods",
  myFood: (id: string) => `/nutrition/my-foods/${encodeURIComponent(id)}`,
} as const;

export const GAMIFICATION_ENDPOINTS = {
  PROFILE: "/gamification/profile",
  BADGES: "/gamification/badges",
} as const;

/** localStorage key mapping badge id -> ISO date first observed as earned. */
export const BADGE_EARNED_DATES_KEY = "fitmind-badge-earned-dates";

/** localStorage key under which the Zustand auth store is persisted. */
export const AUTH_STORAGE_KEY = "fitmind-auth";

/** localStorage key for per-device display preferences (color mode). */
export const PREFERENCES_STORAGE_KEY = "fitmind-preferences";

/**
 * The chat/notification WebSocket (`/ws`) is mounted at the app root, not
 * under `API_PREFIX`, so its URL is derived from `API_BASE_URL` directly and
 * the http(s) scheme is swapped for ws(s). The user is identified by an auth
 * frame sent after connecting, never by the URL.
 */
export function getChatSocketUrl(): string {
  const wsProtocol = API_BASE_URL.startsWith("https") ? "wss" : "ws";
  const host = API_BASE_URL.replace(/^https?:\/\//, "");
  return `${wsProtocol}://${host}/ws`;
}

/** WebSocket close code the backend uses when authentication fails. */
export const WS_CLOSE_UNAUTHORIZED = 4401;

/** Header carrying the browser's IANA timezone, which decides the user's "today". */
export const TIMEZONE_HEADER = "X-Timezone";

/** localStorage key prefix for a user's persisted coach chat history. */
export const CHAT_HISTORY_KEY_PREFIX = "fitmind-chat-history-";

export const NOTIFICATION_ENDPOINTS = {
  LIST: "/notifications",
  read: (id: string) => `/notifications/${encodeURIComponent(id)}/read`,
} as const;

export const FRIEND_ENDPOINTS = {
  REQUEST: "/friends/request",
  LIST: "/friends/list",
  REQUESTS: "/friends/requests",
  accept: (id: string) => `/friends/accept/${encodeURIComponent(id)}`,
  decline: (id: string) => `/friends/decline/${encodeURIComponent(id)}`,
  nudge: (userId: string) => `/friends/nudge/${encodeURIComponent(userId)}`,
  search: (username: string) => `/friends/${encodeURIComponent(username)}`,
} as const;

export const LEADERBOARD_ENDPOINTS = {
  WEEKLY: "/leaderboard/weekly",
} as const;

export const REPORT_ENDPOINTS = {
  HISTORY: "/reports/history",
  LATEST: "/reports/latest",
  GENERATE: "/reports/generate",
  byId: (id: string) => `/reports/${encodeURIComponent(id)}`,
} as const;

export const SETTINGS_ENDPOINTS = {
  PROFILE: "/settings/profile",
  GOALS: "/settings/goals",
  PREFERENCES: "/settings/preferences",
  PASSWORD: "/settings/password",
  ACCOUNT: "/settings/account",
} as const;

export const DIET_PLAN_ENDPOINTS = {
  CURRENT: "/diet-plans/current",
  CREATE: "/diet-plans",
  regenerateMeal: (mealId: string) => `/diet-plans/current/meals/${mealId}/regenerate`,
  alternatives: (mealId: string, index: number) =>
    `/diet-plans/current/meals/${mealId}/items/${index}/alternatives`,
  swap: (mealId: string, index: number) => `/diet-plans/current/meals/${mealId}/items/${index}/swap`,
  logMeal: (mealId: string) => `/diet-plans/current/meals/${mealId}/log`,
} as const;

export const TIP_ENDPOINTS = {
  TODAY: "/tips/today",
} as const;

export const ACTIVITY_ENDPOINTS = {
  STEPS: "/activity/steps",
  stepsDay: (date: string) => `/activity/steps/${encodeURIComponent(date)}`,
  SETTINGS: "/activity/settings",
  ROUTINES: "/activity/desk-routines",
  routine: (id: string) => `/activity/desk-routines/${encodeURIComponent(id)}`,
} as const;

export const FOOD_SCAN_ENDPOINTS = {
  barcode: (code: string) => `/nutrition/barcode/${encodeURIComponent(code)}`,
  PHOTO: "/nutrition/photo-estimate",
} as const;

export const COACH_ENDPOINTS = {
  CONVERSATION: "/coach/conversation",
  HISTORY: "/coach/history",
  MESSAGES: "/coach/messages",
  MENU: "/coach/menu",
  confirm: (id: string) => `/coach/actions/${encodeURIComponent(id)}/confirm`,
  cancel: (id: string) => `/coach/actions/${encodeURIComponent(id)}/cancel`,
} as const;
