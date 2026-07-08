import { FormHelperText, Stack } from '@mui/material';
import { StepHeader } from './StepHeader';
import { OptionSelector } from './OptionSelector';
import { EXPERIENCE_OPTIONS, ONBOARDING_STRINGS } from '../../constants/onboarding';
import type { ExperienceLevel, StepProps } from '../../types/onboarding';

const S = ONBOARDING_STRINGS.steps.experience;

export function Step3Experience({ data, errors, onChange }: StepProps) {
  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} helper={S.helper} />
      <OptionSelector<ExperienceLevel>
        options={EXPERIENCE_OPTIONS}
        value={data.experience_level}
        onChange={(experience_level) => onChange({ experience_level })}
        columns={1}
      />
      {errors.experience_level && (
        <FormHelperText error>{errors.experience_level}</FormHelperText>
      )}
    </Stack>
  );
}
