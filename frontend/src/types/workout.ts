/** Workout types, aligned with the backend workout schemas. */

/** A single exercise within a day. `reps`/`rest` are display strings ("12", "45s"). */
export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  difficulty: string;
  video_url?: string | null;
};

/** Known workout types; the AI may return other strings, handled as a fallback. */
export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'rest';

export type WorkoutDay = {
  day: string;
  workout_type: string;
  exercises: Exercise[];
};

export type WeeklyPlan = {
  week: WorkoutDay[];
};

/** `POST /workouts/generate` body; omitted fields fall back to the user's profile. */
export type GeneratePlanPayload = {
  fitness_goal?: string;
  experience_level?: string;
  available_equipment?: string[];
};

/** `POST /workouts/log` body (used from Day 8). */
export type WorkoutLogPayload = {
  date: string;
  duration_minutes: number;
  exercises: Record<string, unknown>[];
};

/** `POST /workouts/log` -> data. */
export type WorkoutLogResult = {
  xp_earned: number;
};
