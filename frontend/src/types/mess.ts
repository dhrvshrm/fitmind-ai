/** PG and hostel mess mode: the meals the mess serves, and no-cook foods on the shelf. */
export type MessMeal = 'breakfast' | 'lunch' | 'dinner';

export type ShelfKey =
  | 'milk'
  | 'curd'
  | 'banana'
  | 'dates'
  | 'almonds'
  | 'peanuts'
  | 'peanut_butter'
  | 'brown_bread'
  | 'roasted_chana'
  | 'sattu'
  | 'eggs'
  | 'paneer'
  | 'oats'
  | 'apple'
  | 'whey'
  | 'butter'
  | 'coffee';

export type MessSetup = {
  mess_meals: MessMeal[];
  shelf: ShelfKey[];
};
