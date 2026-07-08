import { ONBOARDING_STRINGS } from '../constants/onboarding';
import type {
  OnboardingData,
  OnboardingErrors,
  OnboardingPayload,
} from '../types/onboarding';

const V = ONBOARDING_STRINGS.validation;

export type BmiResult = {
  value: number;
  category: string;
  /** MUI color token for the category chip. */
  color: 'info' | 'success' | 'warning' | 'error';
};

/** Returns BMI + category, or `null` until both weight and height are valid. */
export function computeBmi(
  weightKg: number | '',
  heightCm: number | '',
): BmiResult | null {
  if (!weightKg || !heightCm) return null;
  const meters = heightCm / 100;
  const value = weightKg / (meters * meters);
  if (!Number.isFinite(value) || value <= 0) return null;

  const rounded = Math.round(value * 10) / 10;
  if (rounded < 18.5) return { value: rounded, category: 'Underweight', color: 'info' };
  if (rounded < 25) return { value: rounded, category: 'Normal', color: 'success' };
  if (rounded < 30) return { value: rounded, category: 'Overweight', color: 'warning' };
  return { value: rounded, category: 'Obese', color: 'error' };
}

/** Per-step validators, indexed to match the step order in `OnboardingFlow`. */
export const stepValidators: Array<(data: OnboardingData) => OnboardingErrors> = [
  // Step 1 — personal
  (data) => {
    const errors: OnboardingErrors = {};
    if (data.age === '') errors.age = V.ageRequired;
    else if (data.age < 13 || data.age > 100) errors.age = V.ageRange;

    if (!data.gender) errors.gender = V.genderRequired;

    if (data.weight_kg === '') errors.weight_kg = V.weightRequired;
    else if (data.weight_kg < 30 || data.weight_kg > 300) errors.weight_kg = V.weightRange;

    if (data.height_cm === '') errors.height_cm = V.heightRequired;
    else if (data.height_cm < 100 || data.height_cm > 250) errors.height_cm = V.heightRange;

    return errors;
  },
  // Step 2 — goal
  (data) => (data.fitness_goal ? {} : { fitness_goal: V.goalRequired }),
  // Step 3 — experience
  (data) => (data.experience_level ? {} : { experience_level: V.experienceRequired }),
  // Step 4 — equipment
  (data) =>
    data.available_equipment.length > 0 ? {} : { available_equipment: V.equipmentRequired },
  // Step 5 — injuries (optional)
  () => ({}),
];

/** Coerces validated form state into the API payload. */
export function toOnboardingPayload(data: OnboardingData): OnboardingPayload {
  return {
    age: Number(data.age),
    gender: data.gender as OnboardingPayload['gender'],
    weight_kg: Number(data.weight_kg),
    height_cm: Number(data.height_cm),
    fitness_goal: data.fitness_goal as OnboardingPayload['fitness_goal'],
    experience_level: data.experience_level as OnboardingPayload['experience_level'],
    available_equipment: data.available_equipment,
    injuries: data.injuries,
  };
}
