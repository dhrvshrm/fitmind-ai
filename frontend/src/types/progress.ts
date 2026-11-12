/** Progress types (Phase 10), aligned with the backend progress and challenge services. */

export type TrendDirection = 'down' | 'up' | 'steady';

export type TrendSummary = {
  entries: number;
  latest: number | null;
  current_trend: number | null;
  start_trend: number | null;
  change: number;
  weekly_rate: number | null;
  direction: TrendDirection | null;
};

/** `GET /progress/weight` -> data. */
export type WeightTrendPoint = { date: string; weight: number; trend: number };
export type WeightTrend = { points: WeightTrendPoint[]; summary: TrendSummary };

/** `GET /progress/measurements` -> data. */
export type MeasurementPoint = { date: string; value: number; trend: number };
export type MeasurementSeries = { points: MeasurementPoint[]; summary: TrendSummary };
export type Measurements = { waist: MeasurementSeries; hip: MeasurementSeries };

export type WeightLogInput = { weight_kg: number; date?: string };
export type MeasurementInput = { waist_cm?: number; hip_cm?: number; date?: string };

/** `GET /progress/adaptive-target` -> data. */
export type AdaptiveStatus = {
  status: 'no_targets' | 'insufficient_data' | 'low_confidence' | 'on_track' | 'cooldown' | 'suggestion';
  window_days?: number;
  logged_days?: number;
  required_logged_days?: number;
  weigh_ins?: number;
  required_weigh_ins?: number;
  weigh_in_span_days?: number;
  required_span_days?: number;
  current_target?: number;
  formula_tdee?: number;
  missing?: string[];
  average_intake?: number;
  weekly_weight_change?: number;
  estimated_tdee?: number;
  suggested_target?: number;
  change?: number;
  capped?: boolean;
  next_check?: string;
};

/** One entry of `GET /progress/patterns` -> data.patterns. */
export type Pattern = {
  code: string;
  severity: 'info' | 'warning';
  evidence_days: number;
  evidence_of: number;
  values: Record<string, unknown>;
};

export type PatternsResult = { window_days: number; logged_days: number; patterns: Pattern[] };

/** `GET /progress/week-summary` -> data (also `stats` in the weekly insight). */
export type WeekStats = {
  start: string;
  end: string;
  days: number;
  active_days: number;
  meal_days: number;
  meals_logged: number;
  average_calories: number | null;
  calorie_target: number | null;
  protein_days: number;
  average_protein: number | null;
  protein_target: number | null;
  workouts_done: number;
  workouts_planned: number;
  water_days: number;
  flexible_days: number;
  weight_trend: number | null;
  weight_weekly_rate: number | null;
  weight_direction: TrendDirection | null;
  streak: number;
  goal: string | null;
};

/** `GET /progress/weekly-insight` -> data. */
export type WeeklyInsight =
  | {
      status: 'ready';
      week_start: string;
      week_end: string;
      headline: string;
      went_well: string;
      one_change: string;
      stats: WeekStats;
      source: 'ai' | 'rule';
    }
  | {
      status: 'not_enough_data';
      week_start: string;
      week_end: string;
      active_days: number;
      required_active_days: number;
    };

/** One day of `GET /progress/flexible-days` and `GET /progress/effective-target`. */
export type DayTarget = {
  date: string;
  calories: number;
  base_calories: number;
  adjustment: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number | null;
  water_ml: number | null;
  flexible: boolean;
  reason: string | null;
};

export type FlexibleDay = {
  date: string;
  reason: string;
  extra_kcal: number;
  marked_on: string;
  note: string | null;
};

export type FlexibleWeek = {
  week_start: string;
  week_end: string;
  days: DayTarget[];
  flexible_days: FlexibleDay[];
  limits: {
    max_per_week: number;
    default_extra_kcal: number;
    min_extra_kcal: number;
    max_extra_kcal: number;
    reasons: string[];
  };
};

export type FlexibleDayInput = { date: string; reason: string; extra_kcal?: number; note?: string };

/** `GET /progress/photos` -> data. */
export type ProgressPhoto = { id: string; date: string; url: string | null };
export type ProgressPhotos = { available: boolean; photos: ProgressPhoto[]; url_expires_in?: number };

/** Friend challenges (`/challenges`). */
export type ChallengeProgress = { count: number; goal: number; completed: boolean };

export type Challenge = {
  id: string;
  kind: string;
  status: 'pending' | 'active' | 'finished' | 'declined' | 'expired' | 'cancelled';
  is_creator: boolean;
  friend: { id: string; name: string | null };
  start_date: string | null;
  end_date: string | null;
  goal: number;
  unit: string;
  xp_reward: number;
  me: ChallengeProgress | null;
  them: ChallengeProgress | null;
  rewarded: boolean;
  just_rewarded?: boolean;
};

export type ChallengeKind = { kind: string; duration_days: number; goal: number; unit: string };

export type ChallengesResult = {
  challenges: Challenge[];
  kinds: ChallengeKind[];
  xp_reward: number;
  max_open: number;
};
