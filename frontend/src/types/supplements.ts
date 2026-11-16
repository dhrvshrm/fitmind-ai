/** Supplements: the curated catalogue (personalised) and the ones the user tracks. */
export type EvidenceLevel = 'strong' | 'moderate' | 'limited' | 'insufficient';

export type SafetySeverity = 'doctor_first' | 'caution' | 'info';

export type SafetyFlag = {
  code: string;
  severity: SafetySeverity;
  message: string;
};

export type SupplementTiming =
  | 'morning'
  | 'with_breakfast'
  | 'with_lunch'
  | 'with_dinner'
  | 'pre_workout'
  | 'post_workout'
  | 'evening'
  | 'bedtime'
  | 'any';

export type SupplementMacros = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type CatalogSupplement = {
  id: string;
  name: string;
  category: string;
  summary: string;
  extra_caution?: boolean;
  evidence: { use: string; level: EvidenceLevel }[];
  typical_dose: string;
  timing: string;
  default_timing: SupplementTiming;
  macros_per_serving?: (SupplementMacros & { serving_g: number }) | null;
  cautions: string[];
  interactions: string[];
  sources: { title: string; url: string }[];
  safety_flags: SafetyFlag[];
  reasons: string[];
  relevant: boolean;
  doctor_first: boolean;
  /** A sensible starting dose, prefilled when tracking. */
  default_dose?: string;
  /** The best time for this person's day, and why. */
  suggested_timing?: SupplementTiming;
  timing_reason?: string;
  /** Rough monthly cost of a generic product, in rupees. */
  monthly_cost_inr?: number;
  /** Why Indian diets often fall short on it. */
  india_gap?: string;
  /** The food that covers the same need, offered first. */
  food_first?: string;
};

/** One supplement in the bare-minimum list. */
export type EssentialItem = {
  id: string;
  name: string;
  why: string;
  default_dose: string;
  monthly_cost_inr: number;
  /** Null outside India. */
  india_gap: string | null;
  food_first: string;
};

export type Essentials = {
  budget_inr: number;
  india: boolean;
  picks: EssentialItem[];
  later: EssentialItem[];
  ask_doctor: EssentialItem[];
  total_inr: number;
};

/** Serving and macros for a product name, estimated by AI. */
export type LabelEstimate = SupplementMacros & {
  serving_label: string;
  serving_g: number;
  adds_nutrition: boolean;
  confidence: 'high' | 'medium' | 'low';
  note: string;
  estimated: boolean;
  /** False when the product looks like a different kind of supplement. */
  matches_type: boolean;
  type_name: string | null;
};

/** Everything taken, grouped by when in the person's day. */
export type RoutineGroup = {
  slot: string;
  label: string;
  time: string;
  after_training: boolean;
  items: {
    id: string;
    name: string;
    dose: string;
    taken_today: boolean;
    /** A better time that folds it into a step already taken, if any. */
    suggestion: { timing: SupplementTiming; why: string } | null;
  }[];
};

export type SupplementRoutine = { groups: RoutineGroup[] };

export type SupplementCatalog = {
  version: number;
  reviewed: string;
  supplements: CatalogSupplement[];
};

export type UserSupplement = {
  id: string;
  supplement_id: string;
  name: string;
  dose: string;
  timing: SupplementTiming;
  reminder_time: string | null;
  macros_per_serving: SupplementMacros | null;
  notes: string | null;
  taken_today: boolean;
  category: string;
  adds_to_nutrition: boolean;
};

export type UserSupplementPayload = {
  supplement_id?: string | null;
  name?: string | null;
  dose: string;
  timing: SupplementTiming;
  reminder_time?: string | null;
  macros_per_serving?: SupplementMacros | null;
};

export type UserSupplementUpdate = Partial<Omit<UserSupplementPayload, 'supplement_id' | 'name'>>;

export type SupplementDay = {
  date: string;
  taken: number;
  total: number;
};
