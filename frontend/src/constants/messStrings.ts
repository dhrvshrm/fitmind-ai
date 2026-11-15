/** Copy for PG and hostel mess mode. */
import type { MessMeal, ShelfKey } from '../types/mess';

const rupees = (n: number) => `₹${Math.round(n)}`;

export const MESS_STRINGS = {
  card: {
    title: 'PG or hostel mess',
    subtitleOff: 'Eat at a mess? Tell us which meals it serves and what you keep on your shelf.',
    subtitleOn: 'The mess covers its meals; your shelf covers the rest, with no cooking.',
    setUp: 'Set up',
    edit: 'Edit',
    on: (meals: string) => `On: the mess serves ${meals}.`,
    shelfLine: (count: number) => (count === 1 ? '1 food on your shelf.' : `${count} foods on your shelf.`),
    noShelf: 'Nothing on your shelf yet. Add a few things for the meals the mess doesn’t cover.',
    suggestMess: 'You said you eat at a mess. Turn this on so plans stop suggesting dishes you can’t cook.',
  },
  dialog: {
    title: 'Mess mode',
    intro:
      'Your plan keeps the mess’s food for the meals it serves and fills the rest only from what you keep, with nothing to cook.',
    mealsLabel: 'Which meals does your mess serve?',
    shelfLabel: 'What do you keep on your shelf?',
    shelfHelp: 'No-cook foods. Every one you pick is used somewhere in your day. Roasted chana, eggs, milk and sattu are the cheapest protein.',
    save: 'Save and make a new plan',
    saving: 'Saving',
    turnOff: 'Turn off',
    cancel: 'Cancel',
    saved: 'Mess mode is on. Your new plan is ready.',
    off: 'Mess mode is off. Your new plan is ready.',
    needMeal: 'Pick at least one meal the mess serves, or turn mess mode off.',
    error: 'Couldn’t save mess mode. Please try again.',
  },
  meals: {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
  } satisfies Record<MessMeal, string>,
  shelf: {
    milk: 'Milk',
    curd: 'Curd',
    banana: 'Bananas',
    dates: 'Dates',
    almonds: 'Almonds',
    peanuts: 'Roasted peanuts',
    peanut_butter: 'Peanut butter',
    brown_bread: 'Brown bread',
    roasted_chana: 'Roasted chana',
    sattu: 'Sattu',
    eggs: 'Boiled eggs',
    paneer: 'Paneer',
    oats: 'Oats',
    apple: 'Apples',
    whey: 'Protein powder',
    butter: 'Butter',
    coffee: 'Coffee',
  } satisfies Record<ShelfKey, string>,
  plan: {
    messBadge: 'From the mess',
    shelfBadge: 'From your shelf',
    shelfCost: (inr: number) => `about ${rupees(inr)}`,
    messHint:
      'Nobody knows the menu in advance, so this is an average mess meal. Take the roti shown, and log what was actually served (rice, dal, curd): the rest of the day adjusts.',
  },
  notes: {
    mess_mode: (inr: number) =>
      `Mess mode: the mess covers its meals, and the extras from your shelf cost about ${rupees(inr)} a day (rough city prices).`,
    shelf_suggestion: (name: string, price: number, grams: number) =>
      `Your shelf can’t quite cover your protein. Adding ${name.toLowerCase()} (about ${rupees(price)} a serving, ${grams} g protein) would close most of the gap.`,
  },
};
