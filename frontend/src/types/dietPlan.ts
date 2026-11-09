import type { ItemSource, Meal, MealType, Nutrients } from './nutrition';

/** Which meal of the day a planned meal is (sets its label and calorie share). */
export type PlanSlot = 'breakfast' | 'mid_morning' | 'lunch' | 'evening_snack' | 'dinner' | 'bedtime';

/** How the current version of a plan came about. */
export type PlanChange = 'created' | 'regenerated' | 'meal_regenerated' | 'item_swapped';

export type PlanNoteCode = 'protein_short' | 'check_ingredients' | 'medical_advice';

export type PlanNote = {
  code: PlanNoteCode;
  values: Record<string, number>;
};

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
};

export type PlanMealLogResult = {
  meal: Meal;
  plan: DietPlan;
  xp_earned: number;
  total_xp: number;
  new_level: number;
  leveled_up: boolean;
};
