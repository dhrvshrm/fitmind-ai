/** Workout types, aligned with the backend workout schemas. */

import type { MuscleGroup } from './exercise';
import type { SportSetup } from './sport';

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
  /** Quality for its muscle: S (best-evidenced), A (solid), B (stand-in). */
  tier?: 'S' | 'A' | 'B' | null;
  primary_muscles?: MuscleGroup[];
  secondary_muscles?: MuscleGroup[];
  equipment?: string | null;
  image?: string | null;
  per_side?: boolean;
  /** How hard to push, e.g. "Stop 2 reps short of failure". */
  effort?: string;
  /** Reps in reserve: how many more reps you could do at the end of each set. */
  rir?: number;
  /** How much skill or base strength it needs; beginners start with easy ones. */
  skill?: 'easy' | 'moderate' | 'technical';
  /** The full range of motion, in one line. */
  rom?: string | null;
  /** Loads the muscle at its longest (the bottom of an incline curl). */
  loads_stretch?: boolean;
  /** An intensity technique for trained lifters. */
  technique?: 'lengthened_partials' | null;
  /** Progressive overload: last time's sets and what to aim for today. */
  target?: ExerciseTarget;
  /** Body-scan focus work: the area it targets (gets an extra set, never cut). */
  focus_area?: 'arms' | 'legs' | 'trunk';
  /** For an unbalanced limb: the side with less muscle, trained first. */
  weaker_side?: 'left' | 'right';
};

/** Easy conditioning after strength when a body scan shows high body fat. */
export type Finisher = { minutes: number; gym: boolean };

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

/** One warm-up move; a move with no catalogue entry (march on the spot) has no id. */
export type WarmUpMove = { exercise_id: string | null; name: string; dose: string; image: string | null };

/** A three-phase warm-up matched to the day (legs day: bike, hips and knees; push day: treadmill walk, shoulders). */
export type WarmUp = {
  minutes: number;
  /** Phase 1: a few easy minutes of cardio. */
  pulse: WarmUpMove[];
  /** Phase 2: dynamic mobility and activation for today's muscles. */
  mobility: WarmUpMove[];
  /** Phase 3: lighter sets of the first lift; percent is null for one easy bodyweight set. */
  ramp_up: { exercise_id: string | null; name: string; sets: { percent: number | null; reps: number }[] } | null;
};

export type WorkoutDay = {
  day: string;
  workout_type: string;
  /** "Upper body", "Mobility"... (newer plans). */
  focus?: string | null;
  exercises: Exercise[];
  /** Strength days only. */
  warm_up?: WarmUp | null;
  finisher?: Finisher | null;
  /** Walk-and-mobility days: minutes of brisk walking. */
  walk_minutes?: number;
  /** The match itself (a sport week). */
  match?: boolean;
};

export type PlanNoteCode =
  | 'no_pull_equipment'
  | 'injury_adjusted'
  | 'bodyweight_only'
  | 'body_scan_focus'
  | 'foundation_phase'
  | 'doctor_check'
  | 'sport_training';

/** Where someone is in the foundation phase and how far to walk. */
export type FoundationInfo = {
  week: number;
  of: number;
  step_target: number;
  step_goal: number;
  walk_minutes: number;
};

/** How the plan was built. */
export type PlanMeta = {
  basis: string;
  level: string;
  goal: string;
  days_per_week: number;
  session_minutes: number;
  weekly_sets: Record<string, number>;
  /** Hard sets a week per muscle that grow it: [low, high]. */
  volume_target?: [number, number];
  /** The split's usual name. */
  split?: 'full_body' | 'upper_lower' | 'upper_lower_full' | 'push_pull_legs' | 'foundation';
  /** The foundation phase: walking first and three gentle sessions, for the first weeks. */
  foundation?: FoundationInfo | null;
  /** The sport the plan was built for. */
  sport?: SportSetup | null;
  notes: PlanNoteCode[];
  variant: number;
  protected_joints: string[];
  /** The body scan the plan was built around. */
  body_scan?: { id: string; measured_at: string; areas: string[]; weaker: Record<string, string> } | null;
};

export type WeeklyPlan = {
  week: WorkoutDay[];
  meta?: PlanMeta | null;
  /** A body scan was saved after this plan was made. */
  scan_changed?: boolean;
  /** The sport, season phase or match day changed since the plan was made. */
  sport_changed?: boolean;
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
  /** Strength days only. */
  warm_up?: WarmUp | null;
  finisher?: Finisher | null;
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
