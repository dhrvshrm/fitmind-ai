import { Stack } from '@mui/material';
import { StepHeader } from './StepHeader';
import { ChoiceChips } from './ChoiceChips';
import { TagInput } from './TagInput';
import {
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  INJURY_SUGGESTIONS,
  ONBOARDING_STRINGS,
} from '../../constants/onboarding';
import type { ExperienceLevel, StepProps } from '../../types/onboarding';

const S = ONBOARDING_STRINGS.steps.training;

const EXPERIENCE_CHIPS = EXPERIENCE_OPTIONS.map(({ value, label }) => ({ value, label }));
const EQUIPMENT_CHIPS = EQUIPMENT_OPTIONS.map(({ value, label }) => ({ value, label }));

/** Experience, equipment and injuries: what the workout plan has to work with. */
export function StepTraining({ data, errors, onChange }: StepProps) {
  return (
    <Stack spacing={3}>
      <StepHeader title={S.title} />
      <ChoiceChips<ExperienceLevel>
        label={S.experience}
        options={EXPERIENCE_CHIPS}
        value={data.experience_level}
        onChange={(value) => onChange({ experience_level: value ?? '' })}
        error={errors.experience_level}
      />
      <ChoiceChips<string>
        multiple
        label={S.equipment}
        options={EQUIPMENT_CHIPS}
        value={data.available_equipment}
        onChange={(available_equipment) => onChange({ available_equipment })}
        error={errors.available_equipment}
      />
      <TagInput
        label={S.injuries}
        placeholder={S.injuriesPlaceholder}
        suggestions={INJURY_SUGGESTIONS}
        value={data.injuries}
        onChange={(injuries) => onChange({ injuries })}
      />
    </Stack>
  );
}
