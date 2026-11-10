/** Exercise library types (`/exercises`), from free-exercise-db plus FitMind's curated layer. */

export type MuscleGroup =
  | 'abdominals'
  | 'abductors'
  | 'adductors'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'forearms'
  | 'glutes'
  | 'hamstrings'
  | 'lats'
  | 'lower back'
  | 'middle back'
  | 'neck'
  | 'quadriceps'
  | 'shoulders'
  | 'traps'
  | 'triceps';

export type ForceType = 'push' | 'pull' | 'static';

export type ExerciseSummary = {
  id: string;
  name: string;
  force: ForceType | null;
  level: 'beginner' | 'intermediate' | 'expert';
  mechanic: 'compound' | 'isolation' | null;
  equipment: string | null;
  category: string;
  primary_muscles: MuscleGroup[];
  secondary_muscles: MuscleGroup[];
  image: string | null;
  /** Has FitMind coaching notes and can appear in plans. */
  curated: boolean;
  pattern: string | null;
};

export type ExerciseCoaching = {
  pattern: string;
  unit: 'reps' | 'seconds';
  per_side: boolean;
  grip: string;
  stance: string;
  steps: string[];
  cues: string[];
  mistakes: string[];
  breathing: string;
  video_url: string | null;
  /** True once a certified trainer has checked the notes. */
  reviewed: boolean;
};

/** `GET /exercises/{id}`. */
export type ExerciseDetail = ExerciseSummary & {
  images: string[];
  instructions: string[];
  stabilizers: MuscleGroup[];
  coaching: ExerciseCoaching | null;
  easier: ExerciseSummary | null;
  harder: ExerciseSummary | null;
  source: string;
};

export type ExerciseSearchParams = {
  q?: string;
  muscle?: MuscleGroup;
  curated?: boolean;
};

export type ExerciseSearchResult = {
  exercises: ExerciseSummary[];
  muscles: MuscleGroup[];
};
