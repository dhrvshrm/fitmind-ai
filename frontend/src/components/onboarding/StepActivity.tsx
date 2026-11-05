import { FormHelperText, Stack } from '@mui/material';
import { StepHeader } from './StepHeader';
import { OptionSelector } from './OptionSelector';
import { ChoiceChips } from './ChoiceChips';
import {
  ACTIVITY_OPTIONS,
  ONBOARDING_STRINGS,
  WORKOUT_DAYS_OPTIONS,
  WORKOUT_TIME_OPTIONS,
} from '../../constants/onboarding';
import type { ActivityLevel, StepProps, WorkoutTime } from '../../types/onboarding';

const S = ONBOARDING_STRINGS.steps.activity;

export function StepActivity({ data, errors, onChange }: StepProps) {
  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} helper={S.helper} />
      <OptionSelector<ActivityLevel>
        options={ACTIVITY_OPTIONS}
        value={data.activity_level}
        onChange={(activity_level) => onChange({ activity_level })}
        columns={1}
      />
      {errors.activity_level && <FormHelperText error>{errors.activity_level}</FormHelperText>}

      <ChoiceChips<number>
        label={S.workoutDays}
        options={WORKOUT_DAYS_OPTIONS}
        value={data.workout_days_per_week}
        onChange={(value) => onChange({ workout_days_per_week: value ?? '' })}
      />
      <ChoiceChips<WorkoutTime>
        label={S.workoutTime}
        options={WORKOUT_TIME_OPTIONS}
        value={data.workout_time}
        onChange={(value) => onChange({ workout_time: value ?? '' })}
      />
    </Stack>
  );
}
