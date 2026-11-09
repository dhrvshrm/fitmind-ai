/**
 * TanStack Query cache keys. Keys are hierarchical, so invalidating a domain
 * root (e.g. `QUERY_KEYS.nutrition.all`) refreshes every query under it.
 */
export const QUERY_KEYS = {
  dashboard: {
    all: ['dashboard'] as const,
    summary: ['dashboard', 'summary'] as const,
    moodPerformance: ['dashboard', 'mood-performance'] as const,
    weightTrend: ['dashboard', 'weight-trend'] as const,
    workoutRate: ['dashboard', 'workout-rate'] as const,
    xpWeekly: ['dashboard', 'xp-weekly'] as const,
    recoveryTrend: ['dashboard', 'recovery-trend'] as const,
  },
  nutrition: {
    all: ['nutrition'] as const,
    today: ['nutrition', 'today'] as const,
    recent: ['nutrition', 'recent'] as const,
    savedMeals: ['nutrition', 'saved-meals'] as const,
    userFoods: ['nutrition', 'my-foods'] as const,
    foodSearch: (query: string) => ['nutrition', 'food-search', query] as const,
  },
  dietPlan: {
    all: ['diet-plan'] as const,
    current: ['diet-plan', 'current'] as const,
    swapRoot: ['diet-plan', 'swap'] as const,
    swapOptions: (mealId: string, index: number, query: string) =>
      ['diet-plan', 'swap', mealId, index, query] as const,
  },
  workouts: {
    all: ['workouts'] as const,
    plan: ['workouts', 'plan'] as const,
    today: ['workouts', 'today'] as const,
    history: (days: number) => ['workouts', 'history', days] as const,
  },
  recovery: {
    all: ['recovery'] as const,
    score: ['recovery', 'score'] as const,
    history: (days: number) => ['recovery', 'history', days] as const,
  },
  voice: {
    all: ['voice'] as const,
    history: (limit: number) => ['voice', 'history', limit] as const,
  },
  gamification: {
    all: ['gamification'] as const,
    profile: ['gamification', 'profile'] as const,
    badges: ['gamification', 'badges'] as const,
  },
  reports: {
    all: ['reports'] as const,
    history: ['reports', 'history'] as const,
    latest: ['reports', 'latest'] as const,
    byId: (id: string) => ['reports', 'detail', id] as const,
  },
  friends: {
    all: ['friends'] as const,
    list: ['friends', 'list'] as const,
    requests: ['friends', 'requests'] as const,
    leaderboard: ['friends', 'leaderboard'] as const,
  },
  profile: {
    all: ['profile'] as const,
    settings: ['profile', 'settings'] as const,
    user: ['profile', 'user'] as const,
    targets: ['profile', 'targets'] as const,
    notificationPreferences: ['profile', 'notification-preferences'] as const,
  },
} as const;
