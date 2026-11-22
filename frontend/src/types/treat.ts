import type { MealItem, MealLogResult, Nutrients } from './nutrition';

/** What someone is craving; mirrors `cravings` in backend app/nutrition/data/treats.json. */
export type Craving = 'sweet' | 'cake' | 'pizza_burger' | 'salty' | 'tandoori' | 'street_food';

/** A tip shown with a treat, worded on screen (e.g. salt for high blood pressure). */
export type TreatTip = 'salt';

export type TreatWeek = {
  logged: number;
  suggested: number;
};

/** One lighter option for a craving, with numbers from the food database. */
export type TreatOption = {
  id: string;
  craving: Craving;
  name: string;
  instead_of: string;
  why: string;
  tips: TreatTip[];
  items: Omit<MealItem, 'edited'>[];
  nutrients: Nutrients;
};

/** `GET /diet-plans/treats?craving=` -> data. */
export type TreatOptions = {
  craving: Craving;
  options: TreatOption[];
  calories_remaining: number;
  week: TreatWeek;
};

/** `POST /diet-plans/treats/{id}/log` -> data. */
export type TreatLogResult = MealLogResult & {
  week: TreatWeek;
};
