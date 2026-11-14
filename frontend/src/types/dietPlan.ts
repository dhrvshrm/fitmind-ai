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
export type CookingFatKind = 'oil' | 'ghee' | 'butter';

/** Oil, ghee or butter a dish's calories assume (already counted in them). */
export type CookingFat = {
  kind: CookingFatKind;
  grams: number;
  tsp: number;
  kcal_per_tsp: number;
  /** Worked out from the dish's fat because its recipe isn't mapped. */
  estimated?: boolean;
};

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
  cooking_fat?: CookingFat[];
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
  /** The meal's cooking fat in teaspoons, by kind. */
  cooking_fat?: { kind: CookingFatKind; tsp: number; estimated?: boolean }[];
};

export type PlanTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
};

export type PlanMealStatus = 'planned' | 'logged' | 'eaten';

/** A meal from today's food log, shown in the plan slot it was matched to. */
export type EatenLog = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  eaten_at: string | null;
  /** When it was eaten, or else logged ("HH:MM"). */
  time?: string | null;
};

/** Smaller or bigger portions for a meal still to come, to land near the targets. */
export type PortionAdjust = {
  portion_percent: number;
  kcal_delta: number;
};

export type PlanMealToday = {
  status: PlanMealStatus;
  eaten: EatenLog[];
  eaten_totals?: { calories: number; protein: number };
  adjust: PortionAdjust | null;
};

export type PlanDayState = 'not_started' | 'on_track' | 'ahead' | 'behind' | 'over';

export type PlanDay = {
  eaten_kcal: number;
  eaten_protein: number;
  target_kcal: number;
  target_protein: number;
  left_kcal: number;
  meals_left: number;
  state: PlanDayState;
  protein_gap: number;
  /** Logs that matched no plan slot (e.g. a snack when the plan has none). */
  extras: EatenLog[];
};

/** Today's food log laid over the plan. */
export type PlanToday = {
  meals: Partial<Record<PlanSlot, PlanMealToday>>;
  day: PlanDay;
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
  /** What was eaten today, slot by slot, and how the rest of the day adjusts. */
  today?: PlanToday;
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

/** `extra` is added by the app: something eaten today that no plan meal covers. */
export type RoutineKind = 'wake' | 'workout' | 'meal' | 'wind_down' | 'sleep' | 'fast_begins' | 'extra';

export type RoutineEvent = {
  time: string;
  kind: RoutineKind;
  meal_id?: PlanSlot;
  values: Record<string, number>;
  /** For `extra`: the off-plan food that was eaten. */
  log?: EatenLog;
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
