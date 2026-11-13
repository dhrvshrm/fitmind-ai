/** Workout types, aligned with the backend workout schemas. */

import type { MuscleGroup } from './exercise';

/**
 * A single exercise within a day. `reps`/`rest` are display strings
 * ("8-12", "45s"). Plans built from the exercise catalogue also carry the
 * catalogue id, movement pattern, muscles and a photo; older plans may not.
 */
export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  difficulty: string;
  video_url?: string | null;
  exercise_id?: string;
  pattern?: string;
  primary_muscles?: MuscleGroup[];
  secondary_muscles?: MuscleGroup[];
  equipment?: string | null;
  image?: string | null;
  per_side?: boolean;
  /** How hard to push, e.g. "Stop 2 reps short of failure". */
  effort?: string;
  /** Progressive overload: last time's sets and what to aim for today. */
  target?: ExerciseTarget;
};

/** One logged set. Bodyweight exercises store a weight of 0. */
export type SetEntry = {
  weight_kg: number;
  reps: number;
};

export type TargetAction =
  | 'first_time'
  | 'add_weight'
  | 'add_reps'
  | 'hold'
  | 'reduce'
  | 'harder_variation'
  | 'add_set'
  | 'deload';

/** What to aim for today, from the exercise's logged history (rules, not AI). */
export type ExerciseTarget = {
  action: TargetAction;
  /** Suggested weight; null for bodyweight exercises or a first session. */
  weight_kg: number | null;
  /** Rep range to aim for: [low, high]. */
  reps: [number, number];
  /** True when the exercise takes added weight (tracked in kg). */
  loaded: boolean;
  last: { date: string; sets: SetEntry[] } | null;
  harder_id?: string;
  harder_name?: string;
};

/** How the user said an exercise felt; steers the next target. */
export type Felt = 'easy' | 'right' | 'hard';

/** Known workout types; the AI may return other strings, handled as a fallback. */
export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'rest';

export type WorkoutDay = {
  day: string;
  workout_type: string;
  /** "Upper body", "Mobility"... (newer plans). */
  focus?: string | null;
  exercises: Exercise[];
};

export type PlanNoteCode = 'no_pull_equipment' | 'injury_adjusted' | 'bodyweight_only';

/** How the plan was built. */
export type PlanMeta = {
  basis: string;
  level: string;
  goal: string;
  days_per_week: number;
  session_minutes: number;
  weekly_sets: Record<string, number>;
  notes: PlanNoteCode[];
  variant: number;
  protected_joints: string[];
};

export type WeeklyPlan = {
  week: WorkoutDay[];
  meta?: PlanMeta | null;
};

/** normal, light (fewer sets after poor recovery) or rest (mobility instead). */
export type TodayMode = 'normal' | 'light' | 'rest';

/** `GET /workouts/plan/today`. */
export type TodayWorkout = {
  day: string;
  focus: string | null;
  workout_type: string;
  exercises: Exercise[];
  mode: TodayMode;
  recovery_score: number | null;
  has_plan: boolean;
  /** A quick session replaced the planned one today. */
  quick: boolean;
  minutes?: number;
  place?: QuickPlace;
  rounds?: number;
  /** What was planned before low recovery switched today to mobility. */
  planned_focus?: string | null;
  /** Last day of an accepted easy week, or null. */
  deload_until?: string | null;
};

export type QuickPlace = 'home' | 'gym';

export type QuickSessionPayload = {
  minutes: 10 | 15 | 20;
  place: QuickPlace;
};

/** `POST /workouts/generate` body; omitted fields fall back to the user's profile. */
export type GeneratePlanPayload = {
  fitness_goal?: string;
  experience_level?: string;
  available_equipment?: string[];
};

export type Intensity = 'low' | 'medium' | 'high';

/** One exercise's completion summary sent in the workout log. */
export type LoggedExercise = {
  name: string;
  sets_completed: number;
  sets_total: number;
  /** Catalogue id; with `sets`, feeds progressive overload. */
  exercise_id?: string;
  sets?: SetEntry[];
  felt?: Felt;
};

/** A personal record set in the logged workout. */
export type PersonalRecord = {
  exercise_id: string;
  name: string;
  kind: 'weight' | 'estimated_max' | 'reps';
  value: number;
  previous: number;
};

/** `POST /workouts/log` body. */
export type WorkoutLogPayload = {
  exercises: LoggedExercise[];
  duration_minutes: number;
  intensity: Intensity;
};

/** `POST /workouts/log` -> data: XP award, level change, and any new badges. */
export type WorkoutLogResult = {
  xp_earned: number;
  total_xp: number;
  new_level: number;
  leveled_up: boolean;
  new_badges: string[];
  new_records?: PersonalRecord[];
};

/** `GET /workouts/progression`: easy-week and level suggestions. */
export type LevelLift = { pattern: string; ratio: number; needed: number; met: boolean };

export type LevelCheck = {
  level: string;
  next_level: string | null;
  ready: boolean;
  workouts?: number;
  /** 75% of the user's own planned sessions in the window (with a floor). */
  workouts_needed?: number;
  days_per_week?: number;
  window_days?: number;
  lifts?: LevelLift[];
  lifts_needed?: number;
  uses_bodyweight?: boolean;
  snoozed?: boolean;
};

/** A likely reason outside the gym for stalled lifts, from logged data only. */
export type StallReason =
  | { kind: 'protein'; percent: number; days: number }
  | { kind: 'sleep'; hours: number }
  | { kind: 'recovery'; score: number };

export type ProgressionSuggestions = {
  deload: { stalled_lifts: string[]; days: number; reasons: StallReason[] } | null;
  deload_until: string | null;
  level: LevelCheck | null;
};

/** `GET /workouts/strength`: estimated one-rep-max trend per lift. */
export type StrengthPoint = { date: string; estimated_max_kg: number };

export type StrengthLift = {
  exercise_id: string;
  name: string;
  sessions: number;
  current_estimated_max_kg: number;
  change_percent: number | null;
  points: StrengthPoint[];
};

export type StrengthSummary = { lifts: StrengthLift[]; change_days: number };

/** One item in `GET /workouts/history` -> data.workouts. */
export type WorkoutHistoryItem = {
  date: string;
  duration_minutes: number;
  intensity: string;
  xp_earned: number;
  exercises: Record<string, unknown>[];
};

/** `PUT /workouts/exercise/complete` -> data. */
export type ExerciseCompleteResult = {
  exercise_name: string;
  completed_today: string[];
  completed_count: number;
};
