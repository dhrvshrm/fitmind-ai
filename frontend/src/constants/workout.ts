import type { ComponentType } from 'react';
import type { Palette, SvgIconProps } from '@mui/material';
import {
  DirectionsRunRounded,
  FitnessCenterRounded,
  HotelRounded,
  SelfImprovementRounded,
} from '@mui/icons-material';
import { STRINGS } from './strings';
import type { WorkoutType } from '../types/workout';

/** Palette entry a workout type is tinted with (`neutral` is the secondary text color). */
export type WorkoutTypeTone = 'primary' | 'secondary' | 'info' | 'warning' | 'neutral';

export type WorkoutTypeMeta = {
  label: string;
  /** Theme tone for day cards/chips; always paired with the text label. */
  tone: WorkoutTypeTone;
  icon: ComponentType<SvgIconProps>;
};

/** Per-type presentation. Unknown AI-returned types fall back to `DEFAULT_TYPE_META`. */
export const WORKOUT_TYPE_META: Record<WorkoutType, WorkoutTypeMeta> = {
  strength: {
    label: STRINGS.workout.types.strength,
    tone: 'info',
    icon: FitnessCenterRounded,
  },
  cardio: {
    label: STRINGS.workout.types.cardio,
    tone: 'warning',
    icon: DirectionsRunRounded,
  },
  flexibility: {
    label: STRINGS.workout.types.flexibility,
    tone: 'secondary',
    icon: SelfImprovementRounded,
  },
  rest: {
    label: STRINGS.workout.types.rest,
    tone: 'neutral',
    icon: HotelRounded,
  },
};

export const DEFAULT_TYPE_META: WorkoutTypeMeta = {
  label: STRINGS.workout.types.other,
  tone: 'primary',
  icon: FitnessCenterRounded,
};

export function getWorkoutTypeMeta(workoutType: string): WorkoutTypeMeta {
  const key = workoutType.trim().toLowerCase() as WorkoutType;
  return WORKOUT_TYPE_META[key] ?? DEFAULT_TYPE_META;
}

/** Resolves a workout type tone to a concrete color from the active palette. */
export function getWorkoutToneColor(palette: Palette, tone: WorkoutTypeTone): string {
  return tone === 'neutral' ? palette.text.secondary : palette[tone].main;
}
