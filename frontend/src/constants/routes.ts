/** Central registry of client-side route paths. */
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  COACH: '/coach',
  WORKOUTS: '/workouts',
  RECOVERY: '/recovery',
  VOICE_CHECKIN: '/voice-checkin',
  NUTRITION: '/nutrition',
  MEAL_PLAN: '/meal-plan',
  GAMIFICATION: '/gamification',
  REPORTS: '/reports',
  FRIENDS: '/friends',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;

/** Where a new user, or one who hasn't finished onboarding, lands after signing in. */
export const POST_AUTH_REDIRECT = ROUTES.ONBOARDING;
