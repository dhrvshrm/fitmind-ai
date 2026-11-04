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
  return { ...item, quantity, grams, nutrients, quantity_assumed: false };
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

/** "Aloo paratha, Curd" style title from the user's own words, capitalised. */
export function mealNameFrom(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
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
