/** Copy for healthy treats on the meal plan. */
import type { Craving, TreatTip } from '../types/treat';

/** Display order of the cravings. */
export const CRAVINGS: Craving[] = ['sweet', 'cake', 'pizza_burger', 'salty', 'tandoori', 'street_food'];

const CRAVING_NAMES: Record<Craving, string> = {
  sweet: 'Something sweet',
  cake: 'Cake or pancakes',
  pizza_burger: 'Pizza, burger or sandwich',
  salty: 'Salty or crunchy',
  tandoori: 'Tikka or tandoori',
  street_food: 'Street food',
};

const TIPS: Record<TreatTip, string> = {
  salt: 'Go easy on added salt and chaat masala, for your blood pressure.',
};

export const TREAT_STRINGS = {
  cravings: CRAVING_NAMES,
  tips: TIPS,
  card: {
    title: 'Craving something?',
    subtitle:
      'Pick what you feel like and get a lighter version that still hits the spot. Once you log it, the rest of today makes room.',
    cravingsAria: 'What are you craving?',
    week: (logged: number, suggested: number) =>
      `${logged} of ${suggested} suggested treats this week`,
  },
  dialog: {
    subtitle: 'Lightest first. Every number comes from the food database.',
    caloriesLeft: (kcal: number) =>
      kcal >= 0 ? `${Math.round(kcal)} kcal left in today's plan.` : `${Math.round(-kcal)} kcal over today's plan.`,
    insteadOf: (what: string) => `Instead of ${what}`,
    kcal: (kcal: number) => `${Math.round(kcal)} kcal`,
    protein: (grams: number) => `${Math.round(grams)} g protein`,
    whatsIn: "What's in it",
    // Whole or half amounts read well ("2 slice", "0.5 piece"); odd ones like 0.42 show grams only.
    item: (name: string, quantity: number, unit: string, grams: number) =>
      Number.isInteger(quantity * 2)
        ? `${name}: ${quantity} ${unit}, ${Math.round(grams)} g`
        : `${name}: ${Math.round(grams)} g`,
    log: "I'm having this",
    logging: 'Logging...',
    logged: (name: string) => `${name} logged. The rest of today's meals are resized to fit.`,
    overWeek: (logged: number, suggested: number) =>
      `That makes ${logged} treats this week, more than the ${suggested} we suggest. Now and then is fine.`,
    error: 'Could not log the treat. Please try again.',
    loadError: 'Could not load treats.',
    empty: 'Nothing for this craving fits your diet and health profile. Try another craving.',
    close: 'Close',
  },
};
