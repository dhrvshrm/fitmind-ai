import type { MessMeal, ShelfKey } from '../types/mess';

export const MESS_MEALS: MessMeal[] = ['breakfast', 'lunch', 'dinner'];

/** Shelf foods in the order shown: the cheap protein first. */
export const SHELF_KEYS: ShelfKey[] = [
  'milk', 'roasted_chana', 'eggs', 'sattu', 'peanuts', 'peanut_butter', 'brown_bread', 'curd',
  'banana', 'dates', 'almonds', 'oats', 'paneer', 'apple', 'butter', 'coffee', 'whey',
];

/** Shelf foods that come from animals, hidden for vegans (eggs also for vegetarians). */
export const SHELF_DAIRY: ShelfKey[] = ['milk', 'curd', 'paneer', 'whey', 'butter'];
