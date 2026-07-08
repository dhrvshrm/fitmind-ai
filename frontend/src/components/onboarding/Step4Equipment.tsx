import { FormHelperText, Stack } from '@mui/material';
import { StepHeader } from './StepHeader';
import { OptionSelector } from './OptionSelector';
import { EQUIPMENT_OPTIONS, ONBOARDING_STRINGS } from '../../constants/onboarding';
import type { StepProps } from '../../types/onboarding';

const S = ONBOARDING_STRINGS.steps.equipment;

export function Step4Equipment({ data, errors, onChange }: StepProps) {
  /** Toggle a piece of equipment in/out of the selected list. */
  function toggle(value: string) {
    const selected = data.available_equipment;
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange({ available_equipment: next });
  }

  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} helper={S.helper} />
      <OptionSelector
        options={EQUIPMENT_OPTIONS}
        value={data.available_equipment}
        onChange={toggle}
        multiple
      />
      {errors.available_equipment && (
        <FormHelperText error>{errors.available_equipment}</FormHelperText>
      )}
    </Stack>
  );
}
