import { Stack, TextField, Typography } from '@mui/material';
import { StepHeader } from './StepHeader';
import { ChoiceChips } from './ChoiceChips';
import { TagInput } from './TagInput';
import {
  BUDGET_OPTIONS,
  COOK_OPTIONS,
  EAT_OUT_OPTIONS,
  ONBOARDING_STRINGS,
  PANTRY_SUGGESTIONS,
  YES_NO_OPTIONS,
} from '../../constants/onboarding';
import type { Cook, EatOutFrequency, FoodAccess, StepProps } from '../../types/onboarding';

const S = ONBOARDING_STRINGS.steps.access;

/** What the person can realistically eat: who cooks, budget and what's at home. */
export function StepAccess({ data, onChange }: StepProps) {
  const access = data.food_access;

  function update(patch: Partial<FoodAccess>) {
    onChange({ food_access: { ...access, ...patch } });
  }

  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} />
      <Typography variant="body2" color="text.secondary">
        {ONBOARDING_STRINGS.optionalHint}
      </Typography>
      <ChoiceChips<Cook>
        label={S.whoCooks}
        options={COOK_OPTIONS}
        value={access.who_cooks}
        onChange={(who_cooks) => update({ who_cooks })}
      />
      <ChoiceChips<EatOutFrequency>
        label={S.eatsOut}
        options={EAT_OUT_OPTIONS}
        value={access.eats_out}
        onChange={(eats_out) => update({ eats_out })}
      />
      <ChoiceChips<number>
        label={S.budget}
        options={BUDGET_OPTIONS}
        value={access.daily_budget_inr}
        onChange={(daily_budget_inr) => update({ daily_budget_inr })}
      />
      <TagInput
        label={S.pantry}
        placeholder={ONBOARDING_STRINGS.steps.food.tagPlaceholder}
        suggestions={PANTRY_SUGGESTIONS}
        value={access.pantry}
        onChange={(pantry) => update({ pantry })}
      />
      <ChoiceChips<boolean>
        label={S.openToNew}
        options={YES_NO_OPTIONS}
        value={access.open_to_new_ingredients}
        onChange={(open_to_new_ingredients) => update({ open_to_new_ingredients })}
      />
      <TextField
        label={S.region}
        helperText={S.regionHint}
        value={access.region ?? ''}
        onChange={(e) => update({ region: e.target.value || undefined })}
        slotProps={{ htmlInput: { maxLength: 60 } }}
      />
    </Stack>
  );
}
