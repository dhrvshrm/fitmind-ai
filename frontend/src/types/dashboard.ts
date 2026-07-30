/** Dashboard types, aligned with the backend dashboard service. */

/** `GET /dashboard/summary` -> data. Nullable metrics have no data source yet. */
export type DashboardSummary = {
  xp: number;
  level: number;
  streak: number;
  mood_score: number | null;
  recovery_score: number | null;
  workouts_today: number;
};

/** One day of `GET /dashboard/mood-performance` -> data.data. */
export type MoodPerformancePoint = {
  date: string;
  energy: number;
  mood: string;
};

export type MoodPerformanceSummary = {
  average_energy: number;
  total_checkins: number;
  dominant_mood: string | null;
};

export type MoodPerformanceResult = {
  data: MoodPerformancePoint[];
  summary: MoodPerformanceSummary;
};

/** One entry of `GET /dashboard/weight-trend` -> data.data. */
export type WeightTrendPoint = {
  date: string;
  weight: number;
};

export type WeightTrendSummary = {
  start_weight: number | null;
  current_weight: number | null;
  change: number;
  min_weight: number | null;
  max_weight: number | null;
  entries: number;
};

export type WeightTrendResult = {
  data: WeightTrendPoint[];
  summary: WeightTrendSummary;
};

/** One day of `GET /dashboard/workout-rate` -> data.data (zero-filled, 30 days). */
export type WorkoutRatePoint = {
  date: string;
  workouts: number;
};

export type WorkoutRateSummary = {
  total_workouts: number;
  active_days: number;
  period_days: number;
  completion_rate: number;
};

export type WorkoutRateResult = {
  data: WorkoutRatePoint[];
  summary: WorkoutRateSummary;
};

/** One day of `GET /dashboard/xp-weekly` -> data.data (exactly 7 days). */
export type XpWeeklyPoint = {
  date: string;
  xp: number;
};

export type XpWeeklySummary = {
  weekly_total: number;
  daily_average: number;
  best_day: string | null;
};

export type XpWeeklyResult = {
  data: XpWeeklyPoint[];
  summary: XpWeeklySummary;
};

/** One entry of `GET /dashboard/recovery-trend` -> data.data. */
export type RecoveryTrendPoint = {
  date: string;
  score: number;
};

export type RecoveryTrendSummary = {
  average_score: number;
  latest_score: number | null;
  min_score: number | null;
  max_score: number | null;
  trend: "up" | "down" | "flat";
  entries: number;
};

export type RecoveryTrendResult = {
  data: RecoveryTrendPoint[];
  summary: RecoveryTrendSummary;
};

/** A joined point for the mood-vs-workouts scatter (built client-side). */
export type MoodWorkoutPoint = {
  date: string;
  energy: number;
  mood: string;
  workouts: number;
};
