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
