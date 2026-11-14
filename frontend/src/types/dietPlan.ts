import type { ItemSource, Meal, MealType, Nutrients } from './nutrition';
import type { FastingMode, FastingWarning } from './indiaFirst';

/** Which meal of the day a planned meal is (sets its label and calorie share). */
export type PlanSlot =
  | 'pre_workout'
  | 'breakfast'
  | 'mid_morning'
  | 'lunch'
  | 'evening_snack'
  | 'dinner'
  | 'bedtime'
  // Ramadan: before dawn, at sunset, and a light meal later.
  | 'sehri'
  | 'iftar'
  | 'post_iftar';

/** How the current version of a plan came about. */
export type PlanChange = 'created' | 'regenerated' | 'meal_regenerated' | 'item_swapped';

export type PlanNoteCode =
  | 'protein_short'
  | 'check_ingredients'
  | 'medical_advice'
  | 'rule_based'
  | 'health_adjusted';

/** Notes added while a fasting or festival mode is on (values hold text, not only numbers). */
export type FastingNoteCode = 'fasting_mode' | 'fasting_salt' | 'paryushan_practice' | 'ramadan_timings';

export type PlanNote =
  | { code: PlanNoteCode; values: Record<string, number> }
  | { code: FastingNoteCode; values: Record<string, string | number | boolean | null> };

/** One food in a planned meal; numbers always come from the food database. */
export type PlanItem = {
  food_id: string;
  name: string;
  source: ItemSource;
  verified: boolean;
  quantity: number;
  unit: string;
  grams: number;
  nutrients: Nutrients;
  per_100g: Nutrients;
};

export type PlanMeal = {
  id: PlanSlot;
  meal_type: MealType;
  time: string;
  share: number;
  /** Set when the meal is placed around the workout. */
  workout_role?: 'pre' | 'post';
  items: PlanItem[];
  totals: Nutrients;
};

export type PlanTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
};

/** `GET /diet-plans/current`. */
export type DietPlan = {
  id: string;
  version: number;
  status: 'active' | 'archived';
  change: PlanChange;
  created_by: 'ai' | 'user';
  created_at: string;
  targets: PlanTargets;
  meals: PlanMeal[];
  totals: Nutrients;
  notes: PlanNote[];
  /** Plan meals already logged today. */
  logged_today: PlanSlot[];
  /** True when targets or diet answers changed after the plan was made. */
  stale: boolean;
  /** The day from waking to sleep, built around the person's routine. */
  routine: RoutineEvent[];
  /** The fasting mode this plan was made for, and the one on today. */
  fasting_mode?: FastingMode | null;
  active_fasting_mode?: FastingMode | null;
  /** True when today's fasting mode differs from the plan's. */
  mode_changed?: boolean;
  /** Meal times follow the person's own wake and sleep times (night or rotating shifts). */
  shift_aware?: boolean;
};

export type RoutineKind = 'wake' | 'workout' | 'meal' | 'wind_down' | 'sleep' | 'fast_begins';

export type RoutineEvent = {
  time: string;
  kind: RoutineKind;
  meal_id?: PlanSlot;
  values: Record<string, number>;
};

export type PlanMealLogResult = {
  meal: Meal;
  plan: DietPlan;
  xp_earned: number;
  total_xp: number;
  new_level: number;
  leveled_up: boolean;
  fasting_warning?: FastingWarning | null;
};
