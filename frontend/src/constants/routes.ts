/** Central registry of client-side route paths. */
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
} as const;

/** Where a freshly authenticated user lands. */
export const POST_AUTH_REDIRECT = ROUTES.ONBOARDING;
