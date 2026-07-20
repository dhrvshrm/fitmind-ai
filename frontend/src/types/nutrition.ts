/** Nutrition types, aligned with the backend nutrition schemas. */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * `POST /nutrition/meal` body. `meal_type` is not yet stored by the backend
 * (extra fields are ignored) but is sent for forward-compatibility.
 */
export type MealPayload = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_type: MealType;
};

/** A logged meal. `meal_type` appears once the backend starts storing it. */
export type Meal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  date: string;
  meal_type?: MealType;
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

/** Each macro's share of total macro calories, in percent. */
export type MacroPercentages = {
  protein: number;
  carbs: number;
  fats: number;
};

/** `GET /nutrition/today` -> data. */
export type NutritionSummary = {
  date: string;
  totals: MacroTotals;
  goals: MacroTotals;
  macro_percentages: MacroPercentages;
  calories_remaining: number;
  water_ml: number;
  meals_logged: number;
  meals: Meal[];
};

/** `POST /nutrition/meal` -> data. */
export type MealLogResult = {
  meal: Meal;
  xp_earned: number;
  total_xp: number;
  new_level: number;
  leveled_up: boolean;
};
