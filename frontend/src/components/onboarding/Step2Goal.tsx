import { FormHelperText, Stack } from '@mui/material';
import { StepHeader } from './StepHeader';
import { OptionSelector } from './OptionSelector';
import { GOAL_OPTIONS, ONBOARDING_STRINGS } from '../../constants/onboarding';
import type { FitnessGoal, StepProps } from '../../types/onboarding';

const S = ONBOARDING_STRINGS.steps.goal;

export function Step2Goal({ data, errors, onChange }: StepProps) {
  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} helper={S.helper} />
      <OptionSelector<FitnessGoal>
        options={GOAL_OPTIONS}
        value={data.fitness_goal}
        onChange={(fitness_goal) => onChange({ fitness_goal })}
      />
      {errors.fitness_goal && <FormHelperText error>{errors.fitness_goal}</FormHelperText>}
    </Stack>
  );
}
