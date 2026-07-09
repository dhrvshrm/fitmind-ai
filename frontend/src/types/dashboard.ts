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
