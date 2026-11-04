/** Nutrition types, aligned with the backend nutrition schemas. */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Where a food's numbers come from. Datasets and the user's own foods are "verified". */
export type ItemSource = 'INDB' | 'USDA' | 'custom' | 'ai_estimate' | 'unresolved' | 'manual';

/** How a whole meal's numbers were obtained. */
export type MealSource = 'verified' | 'estimated' | 'mixed' | 'manual';

/** Energy (kcal) and macros (g) for an amount of food. */
export type Nutrients = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

/** One food inside a meal, as saved. */
export type MealItem = {
  name: string;
  food_id: string | null;
  source: ItemSource;
  verified: boolean;
  quantity: number;
  unit: string;
  grams: number;
  nutrients: Nutrients;
  edited: boolean;
};

/** `POST /nutrition/meal` body. */
export type MealPayload = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  meal_type: MealType;
  eaten_at?: string | null;
  items?: MealItem[];
};

/** `PUT /nutrition/meal/{id}` body; only provided fields change. */
export type MealUpdatePayload = Partial<Omit<MealPayload, 'meal_type'>> & {
  meal_type?: MealType;
};

/** A logged meal. */
export type Meal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  date: string;
  meal_type?: MealType | null;
  eaten_at?: string | null;
  items: MealItem[];
  source: MealSource;
  edited: boolean;
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
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

export type FoodAlternative = {
  food_id: string;
  name: string;
  score: number;
};

/** One food from `POST /nutrition/estimate`, before the user reviews it. */
export type EstimatedItem = {
  query: string;
  name: string;
  food_id: string | null;
  source: ItemSource;
  verified: boolean;
  quantity: number;
  unit: string;
  grams: number;
  quantity_assumed: boolean;
  nutrients: Nutrients | null;
  per_100g: Nutrients | null;
  confidence: 'high' | 'medium' | 'low';
  note: string | null;
  /** Why the food couldn't be estimated (only for `unresolved` items). */
  unresolved_reason: 'ai_not_configured' | 'ai_quota' | 'ai_failed' | null;
  alternatives: FoodAlternative[];
};

/** `POST /nutrition/estimate` -> data. */
export type MealEstimate = {
  text: string;
  items: EstimatedItem[];
  totals: Nutrients;
  unresolved_count: number;
};

/** A food from the datasets or the user's library (`GET /nutrition/foods/...`). */
export type Food = {
  id: string;
  name: string;
  full_name: string;
  aliases: string[];
  source: ItemSource;
  per_100g: Nutrients;
  serving: { unit: string; grams: number; from_source: boolean };
  score?: number;
};

/** A meal saved for one-tap logging. */
export type SavedMeal = {
  id: string;
  name: string;
  items: MealItem[];
  totals: Nutrients;
  meal_type: MealType | null;
  times_logged: number;
};

/** A recent distinct meal (`GET /nutrition/recent`). */
export type RecentMeal = Meal & { times_logged: number };

/** A custom food or recipe the user created. */
export type UserFood = {
  id: string;
  name: string;
  aliases: string[];
  serving_unit: string;
  serving_grams: number;
  per_serving: Nutrients;
};

export type UserFoodPayload = {
  name: string;
  serving_unit: string;
  serving_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
};
