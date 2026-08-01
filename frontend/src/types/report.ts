/** Weekly report types, aligned with the backend `WeeklyReport.public_dict()`. */

export type MoodTrend = "improving" | "declining" | "stable";
export type RecoveryTrendLabel = "excellent" | "good" | "moderate" | "low" | "no data";

/** A single weekly report, as returned by every `/reports/*` endpoint. */
export type WeeklyReport = {
  id: string;
  week_start: string;
  week_end: string;
  workouts_completed: number;
  workouts_planned: number;
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fats: number;
  mood_trend: MoodTrend | (string & {});
  recovery_trend: RecoveryTrendLabel | (string & {});
  xp_earned: number;
  content: string;
  highlight: string;
  created_at: string;
};
