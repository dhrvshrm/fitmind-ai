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
};

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
};

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
