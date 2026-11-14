/** Central registry of client-side route paths. */
export const ROUTES = {
  /** Public landing page for people who haven't signed up. */
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  ONBOARDING: '/onboarding',
  TODAY: '/today',
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
  ACTIVITY: '/activity',
  HEALTH: '/health',
} as const;

/** Where a new user, or one who hasn't finished onboarding, lands after signing in. */
export const POST_AUTH_REDIRECT = ROUTES.ONBOARDING;
