import { STRINGS } from '../constants/strings';
import type {
  EstimatedItem,
  Food,
  MealItem,
  MealType,
  Nutrients,
} from '../types/nutrition';

export const EMPTY_NUTRIENTS: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

const NUTRIENT_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [key, round1(per100g[key] * factor)]),
  ) as Nutrients;
}

export function sumNutrients(list: (Nutrients | null)[]): Nutrients {
  return list.reduce<Nutrients>(
    (total, n) =>
      n
        ? (Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, round1(total[k] + n[k])])) as Nutrients)
        : total,
    EMPTY_NUTRIENTS,
  );
}

/**
 * Changes an item's quantity, keeping the same weight per unit and rescaling
 * nutrients from its per-100 g values. Items without per-100 g values (typed
 * in by hand) scale linearly.
 */
export function withQuantity(item: EstimatedItem, quantity: number): EstimatedItem {
  if (!(quantity > 0) || item.quantity <= 0) return item;
  const gramsPerUnit = item.grams / item.quantity;
  const grams = round1(gramsPerUnit * quantity);
  const nutrients = item.per_100g
    ? scaleNutrients(item.per_100g, grams)
    : item.nutrients && scaleLinear(item.nutrients, quantity / item.quantity);
  // The AI's range scales with the amount; a changed amount has been looked at, so its check is done.
  const factor = quantity / item.quantity;
  return {
    ...item,
    quantity,
    grams,
    nutrients,
    quantity_assumed: false,
    kcal_low: item.kcal_low != null ? Math.round(item.kcal_low * factor) : item.kcal_low,
    kcal_high: item.kcal_high != null ? Math.round(item.kcal_high * factor) : item.kcal_high,
    check: null,
  };
}

function scaleLinear(n: Nutrients, factor: number): Nutrients {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, round1(n[k] * factor)])) as Nutrients;
}

/** Replaces an item's food with another (e.g. a "did you mean" choice), keeping the count. */
export function withFood(item: EstimatedItem, food: Food): EstimatedItem {
  const quantity = item.quantity > 0 ? item.quantity : 1;
  const grams = round1(food.serving.grams * quantity);
  return {
    ...item,
    name: food.name,
    food_id: food.id,
    source: food.source,
    verified: food.source !== 'ai_estimate',
    unit: food.serving.unit,
    grams,
    nutrients: scaleNutrients(food.per_100g, grams),
    per_100g: food.per_100g,
    confidence: 'high',
    note: null,
    kcal_low: null,
    kcal_high: null,
    check: null,
    alternatives: item.alternatives.filter((a) => a.food_id !== food.id),
  };
}

/** Fills in nutrients the user typed for an item the estimator couldn't resolve. */
export function withManualNutrients(item: EstimatedItem, nutrients: Nutrients): EstimatedItem {
  return { ...item, source: 'manual', verified: false, nutrients, per_100g: null };
}

/**
 * Converts reviewed items into what's saved with the meal. Changing a
 * quantity keeps the food's source: the numbers still come from the same
 * per-100 g data. Values typed in by hand are marked by the `manual` source.
 */
export function toMealItems(items: EstimatedItem[]): MealItem[] {
  return items
    .filter((item) => item.nutrients)
    .map((item) => ({
      name: item.name,
      food_id: item.food_id,
      source: item.source,
      verified: item.verified,
      quantity: item.quantity,
      unit: item.unit,
      grams: item.grams,
      nutrients: item.nutrients as Nutrients,
      edited: false,
    }));
}

/** Local time as "HH:MM", for the "eaten at" field. */
export function currentTimeHHMM(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** A sensible default meal type for the time of day. */
export function mealTypeForTime(date = new Date()): MealType {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 19 && hour < 23) return 'dinner';
  return 'snack';
}

/** Meals in the order they happen in a day. */
export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/** Typical times, used when a whole-day description doesn't say when a meal was. */
export const DEFAULT_MEAL_TIMES: Record<MealType, string> = {
  breakfast: '08:30',
  lunch: '13:30',
  snack: '17:00',
  dinner: '20:30',
};

/** The different meals a description mentioned, in day order. */
export function mealTypesIn(items: EstimatedItem[]): MealType[] {
  const present = new Set(items.map((i) => i.meal_type).filter((t): t is MealType => Boolean(t)));
  return MEAL_ORDER.filter((type) => present.has(type));
}

export type MealGroup = {
  mealType: MealType;
  eatenAt: string;
  items: EstimatedItem[];
};

/**
 * Splits a whole-day estimate into one group per meal. Foods the description
 * didn't place in a meal go into `fallback` (the meal for the current time).
 */
export function groupByMeal(items: EstimatedItem[], fallback: MealType): MealGroup[] {
  return MEAL_ORDER.map((mealType) => {
    const groupItems = items.filter((i) => (i.meal_type ?? fallback) === mealType);
    const stated = groupItems.find((i) => i.eaten_at)?.eaten_at;
    return { mealType, eatenAt: stated ?? DEFAULT_MEAL_TIMES[mealType], items: groupItems };
  }).filter((group) => group.items.length > 0);
}

/** "Poha, Chai" from a meal's foods, for naming a meal logged from a whole day. */
export function nameFromItems(items: EstimatedItem[]): string {
  return conciseMealName(items);
}

/** Foods with almost no calories (water, black tea) are left out of a meal's name. */
const MIN_KCAL_IN_NAME = 10;
const MAX_FOODS_IN_NAME = 3;

function foodLabel(item: EstimatedItem): string {
  const raw = (item.query || item.name || '').replace(/\s*\(.*?\)/g, '').trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
}

/**
 * A short meal name from its foods: the three heaviest at most, in the order they
 * were said ("Poha and chai", "Rajma curry, rice and salad"). Mirrors backend
 * app/nutrition/naming.py.
 */
export function conciseMealName(items: EstimatedItem[]): string {
  const S = STRINGS.nutrition.review.mealName;
  const labelled = items
    .map((item, index) => ({ kcal: item.nutrients?.kcal ?? 0, index, label: foodLabel(item) }))
    .filter((x) => x.label);
  const main = labelled.filter((x) => x.kcal >= MIN_KCAL_IN_NAME);
  const unique = (main.length ? main : labelled).filter(
    (x, i, all) => all.findIndex((y) => y.label.toLowerCase() === x.label.toLowerCase()) === i,
  );
  if (unique.length === 0) return S.fallback;
  const shown = [...unique]
    .sort((a, b) => b.kcal - a.kcal)
    .slice(0, MAX_FOODS_IN_NAME)
    .sort((a, b) => a.index - b.index)
    .map((x, i) => (i === 0 ? x.label : x.label.charAt(0).toLowerCase() + x.label.slice(1)));
  const rest = unique.length - shown.length;
  if (rest > 0) return S.withMore(shown, rest);
  return S.list(shown);
}
