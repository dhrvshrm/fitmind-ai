/** India-first meal planning (Phase 8): fasting modes and the grocery list. */

export type FastingModeKey = 'navratri' | 'ekadashi' | 'paryushan' | 'ramadan';

export type FastingTiming = 'normal' | 'ramadan';

export type FastingCatalogueEntry = {
  key: FastingModeKey;
  usual_days: number;
  max_days: number;
  single_day: boolean;
  timing: FastingTiming;
};

/** A mode the user switched on for their own dates. */
export type FastingMode = {
  id: string;
  mode: FastingModeKey;
  start_date: string;
  end_date: string;
  dawn_time?: string;
  sunset_time?: string;
  times_given?: boolean;
  status?: 'active' | 'upcoming' | 'past';
  timing?: FastingTiming;
};

/** `GET /diet-plans/fasting-modes`. */
export type FastingModesData = {
  catalogue: FastingCatalogueEntry[];
  modes: FastingMode[];
  active: FastingMode | null;
};

export type FastingModePayload = {
  mode: FastingModeKey;
  start_date: string;
  end_date?: string;
  dawn_time?: string;
  sunset_time?: string;
};

/** Returned after logging when a food breaks the active fast (logging still succeeds). */
export type FastingWarning = {
  mode: FastingModeKey;
  foods: string[];
  end_date: string;
};

export type GroceryAisle =
  | 'vegetables'
  | 'fruits'
  | 'grains_flours'
  | 'pulses'
  | 'dairy'
  | 'meat_fish_eggs'
  | 'spices_others'
  | 'ready_made';

export type GroceryUnit = 'g' | 'kg' | 'ml' | 'l' | 'piece';

export type GroceryItem = {
  key: string;
  name: string;
  aisle: GroceryAisle;
  /** Null for spices and herbs, which are listed without an amount. */
  amount?: number | null;
  unit?: GroceryUnit | null;
  dishes: string[];
  /** Ready-made items only: total servings and weight over the days. */
  servings?: number;
  serving_unit?: string;
  grams?: number;
};

/** `GET /diet-plans/current/grocery-list`. */
export type GroceryList = {
  days: number;
  aisles: { aisle: GroceryAisle; items: GroceryItem[] }[];
  unmapped_count: number;
  /** Ingredients left off because the plan's fast rules them out (onion during Navratri). */
  left_out?: string[];
  plan_id: string;
  plan_version: number;
  fasting_mode: FastingMode | null;
};

export type ShiftSchedule = 'day' | 'night_shift' | 'rotating_shifts';

export type ShiftTimesPayload = {
  lifestyle: { work_schedule?: string; wake_time?: string; sleep_time?: string };
};
