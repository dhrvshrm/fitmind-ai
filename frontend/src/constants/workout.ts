import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material';
import {
  DirectionsRunRounded,
  FitnessCenterRounded,
  HotelRounded,
  SelfImprovementRounded,
} from '@mui/icons-material';
import { STRINGS } from './strings';
import type { WorkoutType } from '../types/workout';

export type WorkoutTypeMeta = {
  label: string;
  /** Accent color for day cards/chips; always paired with the text label. */
  color: string;
  icon: ComponentType<SvgIconProps>;
};

/** Per-type presentation. Unknown AI-returned types fall back to `DEFAULT_TYPE_META`. */
export const WORKOUT_TYPE_META: Record<WorkoutType, WorkoutTypeMeta> = {
  strength: {
    label: STRINGS.workout.types.strength,
    color: '#6366f1',
    icon: FitnessCenterRounded,
  },
  cardio: {
    label: STRINGS.workout.types.cardio,
    color: '#ef4444',
    icon: DirectionsRunRounded,
  },
  flexibility: {
    label: STRINGS.workout.types.flexibility,
    color: '#12b8a6',
    icon: SelfImprovementRounded,
  },
  rest: {
    label: STRINGS.workout.types.rest,
    color: '#64748b',
    icon: HotelRounded,
  },
};

export const DEFAULT_TYPE_META: WorkoutTypeMeta = {
  label: STRINGS.workout.types.other,
  color: '#aa3bff',
  icon: FitnessCenterRounded,
};

export function getWorkoutTypeMeta(workoutType: string): WorkoutTypeMeta {
  const key = workoutType.trim().toLowerCase() as WorkoutType;
  return WORKOUT_TYPE_META[key] ?? DEFAULT_TYPE_META;
}
