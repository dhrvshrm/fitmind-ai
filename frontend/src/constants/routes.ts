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
  GAMIFICATION: '/gamification',
  FRIENDS: '/friends',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;

/** Where a freshly authenticated user lands. */
export const POST_AUTH_REDIRECT = ROUTES.ONBOARDING;
