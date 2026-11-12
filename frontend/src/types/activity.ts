/** Activity types, aligned with the backend `/activity` endpoints. */

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type StepDay = {
  date: string;
  steps: number | null;
};

/** Which activity level the calorie targets use, and why. */
export type ActivityEstimate = {
  self_reported: ActivityLevel | null;
  step_level: ActivityLevel | null;
  effective: ActivityLevel | null;
  source: 'steps' | 'self_reported';
  recent_days_logged: number;
  recent_average: number | null;
  days_needed: number;
  window_days: number;
};

/** `GET /activity/steps` -> data. */
export type StepsSummary = {
  today: string;
  today_steps: number | null;
  target: number;
  target_is_default: boolean;
  days: StepDay[];
  average_7d: number | null;
  days_on_target: number;
  max_backfill_days: number;
  activity: ActivityEstimate;
};

/** `GET /activity/settings` -> data. */
export type ActivitySettings = {
  step_target: number | null;
  break_reminders_enabled: boolean;
  work_start: string;
  work_end: string;
  break_interval_minutes: number;
  /** Monday = 0 ... Sunday = 6. */
  work_days: number[];
  default_step_target: number;
  effective_step_target: number;
};

/** `PUT /activity/settings` body; only provided fields change. */
export type ActivitySettingsUpdate = Partial<
  Pick<
    ActivitySettings,
    'step_target' | 'break_reminders_enabled' | 'work_start' | 'work_end' | 'break_interval_minutes' | 'work_days'
  >
> & { reset_step_target?: boolean };

export type DeskRoutineStep = {
  exercise_id: string;
  name: string;
  /** Hold time for the whole step (both sides together when per_side). */
  seconds: number;
  per_side: boolean;
  image: string | null;
  images: string[];
  cue: string | null;
  joints: string[];
};

export type DeskRoutineFocus = 'wrists' | 'neck' | 'hips' | 'full_body';

export type DeskRoutine = {
  id: string;
  name: string;
  description: string;
  minutes: number;
  focus: DeskRoutineFocus;
  total_seconds: number;
  skipped_for_injury: number;
  steps: DeskRoutineStep[];
};

/** A break reminder due now, worked out in the browser from the settings. */
export type DueBreak = {
  key: string;
  routineId: string;
  minutes: number;
};
