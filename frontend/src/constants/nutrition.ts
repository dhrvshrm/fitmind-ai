import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import {
  BakeryDiningRounded,
  DinnerDiningRounded,
  EggAltRounded,
  LunchDiningRounded,
} from '@mui/icons-material';
import { STRINGS } from './strings';
import type { MealType } from '../types/nutrition';

/** Meal-type options for the form, each with a Material icon. */
export type MealTypeOption = {
  value: MealType;
  label: string;
  icon: ComponentType<SvgIconProps>;
};

export const MEAL_TYPE_OPTIONS: MealTypeOption[] = [
  { value: 'breakfast', label: STRINGS.nutrition.mealTypes.breakfast, icon: EggAltRounded },
  { value: 'lunch', label: STRINGS.nutrition.mealTypes.lunch, icon: LunchDiningRounded },
  { value: 'dinner', label: STRINGS.nutrition.mealTypes.dinner, icon: DinnerDiningRounded },
  { value: 'snack', label: STRINGS.nutrition.mealTypes.snack, icon: BakeryDiningRounded },
];

/** One glass of water in ml, and the daily goal in glasses. */
export const GLASS_ML = 250;
export const WATER_GOAL_GLASSES = 8;

/** kcal per gram of each macro (Atwater factors). */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fats: 9 } as const;
