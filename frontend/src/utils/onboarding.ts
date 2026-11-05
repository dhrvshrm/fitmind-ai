import { GOALS_WITH_PACE, INITIAL_ONBOARDING_DATA, ONBOARDING_STRINGS } from "../constants/onboarding";
import type { TargetsPreviewPayload } from "../services/userService";
import type {
  FoodAccess,
  FoodPreferences,
  Lifestyle,
  OnboardingData,
  OnboardingErrors,
  OnboardingPayload,
  UserProfile,
} from "../types/onboarding";

const V = ONBOARDING_STRINGS.validation;

export type BmiResult = {
  value: number;
  category: string;
  /** MUI color token for the category chip. */
  color: "info" | "success" | "warning" | "error";
};

/** Parses a numeric input into `number | ''` so empty stays empty. */
export function toNumberOrEmpty(raw: string): number | "" {
  if (raw.trim() === "") return "";
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? "" : parsed;
}

/** Returns BMI + category, or `null` until both weight and height are valid. */
export function computeBmi(
  weightKg: number | "",
  heightCm: number | "",
): BmiResult | null {
  if (!weightKg || !heightCm) return null;
  const meters = heightCm / 100;
  const value = weightKg / (meters * meters);
  if (!Number.isFinite(value) || value <= 0) return null;

  const rounded = Math.round(value * 10) / 10;
  if (rounded < 18.5)
    return { value: rounded, category: "Underweight", color: "info" };
  if (rounded < 25)
    return { value: rounded, category: "Normal", color: "success" };
  if (rounded < 30)
    return { value: rounded, category: "Overweight", color: "warning" };
  return { value: rounded, category: "Obese", color: "error" };
}

/** Per-step validators, indexed to match the step order in `OnboardingFlow`. */
export const stepValidators: Array<(data: OnboardingData) => OnboardingErrors> =
  [
    // About you
    (data) => {
      const errors: OnboardingErrors = {};
      if (data.age === "") errors.age = V.ageRequired;
      else if (data.age < 13 || data.age > 100) errors.age = V.ageRange;

      if (!data.gender) errors.gender = V.genderRequired;

      if (data.weight_kg === "") errors.weight_kg = V.weightRequired;
      else if (data.weight_kg < 30 || data.weight_kg > 300)
        errors.weight_kg = V.weightRange;

      if (data.height_cm === "") errors.height_cm = V.heightRequired;
      else if (data.height_cm < 100 || data.height_cm > 250)
        errors.height_cm = V.heightRange;

      if (data.body_fat_percent !== "" && (data.body_fat_percent < 3 || data.body_fat_percent > 60))
        errors.body_fat_percent = V.bodyFatRange;
      return errors;
    },
    // Goal
    (data) => {
      const errors: OnboardingErrors = {};
      if (!data.fitness_goal) errors.fitness_goal = V.goalRequired;
      if (data.target_weight_kg !== "" && (data.target_weight_kg < 30 || data.target_weight_kg > 300))
        errors.target_weight_kg = V.targetWeightRange;
      return errors;
    },
    // Activity
    (data) => (data.activity_level ? {} : { activity_level: V.activityRequired }),
    // Training
    (data) => {
      const errors: OnboardingErrors = {};
      if (!data.experience_level) errors.experience_level = V.experienceRequired;
      if (data.available_equipment.length === 0) errors.available_equipment = V.equipmentRequired;
      return errors;
    },
    // Food, kitchen and budget, routine: all optional
    () => ({}),
    () => ({}),
    () => ({}),
    // Targets review
    () => ({}),
  ];

/** Index of the first step whose answers are all optional. */
export const FIRST_OPTIONAL_STEP = 4;
/** Index of the targets review step. */
export const TARGETS_STEP = 7;

/** Drops unanswered fields so "not answered" is never sent as a value. */
function answered<T extends object>(section: T): T | undefined {
  const entries = Object.entries(section).filter(
    ([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

function optionalNumber(value: number | ""): number | undefined {
  return value === "" ? undefined : Number(value);
}

/** Coerces validated form state into the API payload. */
export function toOnboardingPayload(data: OnboardingData): OnboardingPayload {
  const withPace = data.fitness_goal !== "" && GOALS_WITH_PACE.includes(data.fitness_goal);
  return {
    age: Number(data.age),
    gender: data.gender as OnboardingPayload["gender"],
    weight_kg: Number(data.weight_kg),
    height_cm: Number(data.height_cm),
    fitness_goal: data.fitness_goal as OnboardingPayload["fitness_goal"],
    experience_level: data.experience_level as OnboardingPayload["experience_level"],
    available_equipment: data.available_equipment,
    injuries: data.injuries,
    activity_level: data.activity_level || undefined,
    body_fat_percent: optionalNumber(data.body_fat_percent),
    reproductive_status: data.gender === "female" ? data.reproductive_status || undefined : undefined,
    goal_pace: withPace ? data.goal_pace || undefined : undefined,
    target_weight_kg: withPace ? optionalNumber(data.target_weight_kg) : undefined,
    workout_days_per_week: optionalNumber(data.workout_days_per_week),
    workout_time: data.workout_time || undefined,
    food_preferences: answered<FoodPreferences>(data.food_preferences),
    food_access: answered<FoodAccess>(data.food_access),
    lifestyle: answered<Lifestyle>(data.lifestyle),
  };
}

/** The subset of answers the targets preview needs. */
export function toTargetsPreviewPayload(data: OnboardingData): TargetsPreviewPayload {
  const payload = toOnboardingPayload(data);
  return {
    age: payload.age,
    gender: payload.gender,
    weight_kg: payload.weight_kg,
    height_cm: payload.height_cm,
    fitness_goal: payload.fitness_goal,
    activity_level: payload.activity_level,
    goal_pace: payload.goal_pace,
    body_fat_percent: payload.body_fat_percent,
    reproductive_status: payload.reproductive_status,
    workout_days_per_week: payload.workout_days_per_week,
  };
}

/** Prefills the form from a saved profile, for updating answers later. */
export function profileToOnboardingData(profile: UserProfile): OnboardingData {
  const blank = INITIAL_ONBOARDING_DATA;
  return {
    age: profile.age ?? blank.age,
    gender: profile.gender ?? blank.gender,
    weight_kg: profile.weight_kg ?? blank.weight_kg,
    height_cm: profile.height_cm ?? blank.height_cm,
    body_fat_percent: profile.body_fat_percent ?? blank.body_fat_percent,
    reproductive_status: profile.reproductive_status ?? blank.reproductive_status,
    fitness_goal: profile.fitness_goal ?? blank.fitness_goal,
    goal_pace: profile.goal_pace ?? blank.goal_pace,
    target_weight_kg: profile.target_weight_kg ?? blank.target_weight_kg,
    activity_level: profile.activity_level ?? blank.activity_level,
    workout_days_per_week: profile.workout_days_per_week ?? blank.workout_days_per_week,
    workout_time: profile.workout_time ?? blank.workout_time,
    experience_level: profile.experience_level ?? blank.experience_level,
    available_equipment: profile.available_equipment ?? [],
    injuries: profile.injuries ?? [],
    food_preferences: profile.food_preferences ?? {},
    food_access: profile.food_access ?? {},
    lifestyle: profile.lifestyle ?? {},
  };
}

/** How many of the optional sections have at least one answer (0 to 3). */
export function personalisationCompleteness(profile: UserProfile): { answered: number; total: number } {
  const sections = [profile.food_preferences, profile.food_access, profile.lifestyle];
  return {
    answered: sections.filter((s) => s && Object.keys(s).length > 0).length,
    total: sections.length,
  };
}
