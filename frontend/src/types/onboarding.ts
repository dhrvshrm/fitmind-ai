/** Onboarding domain types, aligned with the backend `UserOnboarding` schema. */

export type Gender = "male" | "female" | "other";
export type FitnessGoal =
  | "fat_loss"
  | "muscle_gain"
  | "recomposition"
  | "maintain"
  | "general_fitness"
  | "athletic_performance";
export type GoalPace = "gentle" | "moderate" | "aggressive";
export type ExperienceLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "Ultra-advanced";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type ReproductiveStatus = "none" | "pregnant" | "breastfeeding" | "unknown";
export type WorkoutTime = "early_morning" | "morning" | "afternoon" | "evening" | "night" | "varies";
export type DietType = "vegetarian" | "eggetarian" | "non_vegetarian" | "vegan" | "jain";
export type Cook = "self" | "family" | "cook" | "mess_or_canteen" | "mixed";
export type EatOutFrequency = "rarely" | "weekly" | "few_times_a_week" | "daily";
export type WorkSchedule = "day" | "night_shift" | "rotating_shifts" | "student" | "at_home" | "other";

/** Food preferences. Every field optional: missing means "not answered". */
export type FoodPreferences = {
  diet_type?: DietType;
  eats_eggs?: boolean;
  eats_dairy?: boolean;
  allergies?: string[];
  intolerances?: string[];
  likes?: string[];
  dislikes?: string[];
  excluded?: string[];
  cuisines?: string[];
};

export type FoodAccess = {
  pantry?: string[];
  who_cooks?: Cook;
  eats_out?: EatOutFrequency;
  daily_budget_inr?: number;
  open_to_new_ingredients?: boolean;
  region?: string;
};

export type Lifestyle = {
  wake_time?: string;
  sleep_time?: string;
  work_schedule?: WorkSchedule;
  meals_per_day?: number;
  water_glasses_per_day?: number;
};

/**
 * Form state. Numeric fields allow `''` so inputs can start empty; they are
 * coerced to numbers when the payload is built (see `toOnboardingPayload`).
 */
export type OnboardingData = {
  age: number | "";
  gender: Gender | "";
  weight_kg: number | "";
  height_cm: number | "";
  body_fat_percent: number | "";
  reproductive_status: ReproductiveStatus | "";
  fitness_goal: FitnessGoal | "";
  goal_pace: GoalPace | "";
  target_weight_kg: number | "";
  activity_level: ActivityLevel | "";
  workout_days_per_week: number | "";
  workout_time: WorkoutTime | "";
  experience_level: ExperienceLevel | "";
  available_equipment: string[];
  injuries: string[];
  food_preferences: FoodPreferences;
  food_access: FoodAccess;
  lifestyle: Lifestyle;
};

/** Exact shape POSTed to `/users/onboarding`; optional answers are omitted when blank. */
export type OnboardingPayload = {
  age: number;
  gender: Gender;
  weight_kg: number;
  height_cm: number;
  fitness_goal: FitnessGoal;
  experience_level: ExperienceLevel;
  available_equipment: string[];
  injuries: string[];
  activity_level?: ActivityLevel;
  body_fat_percent?: number;
  reproductive_status?: ReproductiveStatus;
  goal_pace?: GoalPace;
  target_weight_kg?: number;
  workout_days_per_week?: number;
  workout_time?: WorkoutTime;
  food_preferences?: FoodPreferences;
  food_access?: FoodAccess;
  lifestyle?: Lifestyle;
};

/** One step of the targets calculation; rendered from `code` and `values`. */
export type TargetNote = {
  code: string;
  values: Record<string, number | string>;
};

/** Daily targets and how they were worked out (`GET /users/targets`). */
export type Targets = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  water_ml: number;
  bmr: number;
  tdee: number;
  goal: FitnessGoal;
  adjustment_kcal: number;
  protein_per_kg: number;
  notes: TargetNote[];
  flags: string[];
};

/** `POST /users/onboarding` -> data. */
export type OnboardingResultData = {
  bmi: number;
  tdee: number;
  targets: Targets | null;
};

/** `GET /users/profile` -> data (the fields onboarding reads back). */
export type UserProfile = Partial<Omit<OnboardingPayload, "fitness_goal">> & {
  id: string;
  xp: number;
  level: number;
  fitness_goal?: FitnessGoal | null;
  onboarding_completed?: boolean;
  targets?: Targets | null;
};

/** Field-level validation errors for a single step. */
export type OnboardingErrors = Partial<Record<keyof OnboardingData, string>>;

/** Props every step component receives from `OnboardingFlow`. */
export type StepProps = {
  data: OnboardingData;
  errors: OnboardingErrors;
  onChange: (patch: Partial<OnboardingData>) => void;
};
