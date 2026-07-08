/** Onboarding domain types, aligned with the backend `UserOnboarding` schema. */

export type Gender = 'male' | 'female' | 'other';
export type FitnessGoal =
  | 'lose_weight'
  | 'build_muscle'
  | 'improve_endurance'
  | 'general_fitness';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Form state. Numeric fields allow `''` so inputs can start empty; they are
 * coerced to numbers when the payload is built (see `toOnboardingPayload`).
 */
export type OnboardingData = {
  age: number | '';
  gender: Gender | '';
  weight_kg: number | '';
  height_cm: number | '';
  fitness_goal: FitnessGoal | '';
  experience_level: ExperienceLevel | '';
  available_equipment: string[];
  injuries: string[];
};

/** Exact shape POSTed to `/users/onboarding`. */
export type OnboardingPayload = {
  age: number;
  gender: Gender;
  weight_kg: number;
  height_cm: number;
  fitness_goal: FitnessGoal;
  experience_level: ExperienceLevel;
  available_equipment: string[];
  injuries: string[];
};

/** `POST /users/onboarding` -> data. */
export type OnboardingResultData = {
  bmi: number;
  tdee: number;
};

/** `GET /users/profile` -> data. */
export type UserProfile = {
  id: string;
  xp: number;
  level: number;
};

/** Field-level validation errors for a single step. */
export type OnboardingErrors = Partial<Record<keyof OnboardingData, string>>;

/** Props every step component receives from `OnboardingFlow`. */
export type StepProps = {
  data: OnboardingData;
  errors: OnboardingErrors;
  onChange: (patch: Partial<OnboardingData>) => void;
};
