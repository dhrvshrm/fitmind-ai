import { Stack, Typography } from '@mui/material';
import { StepHeader } from './StepHeader';
import { ChoiceChips } from './ChoiceChips';
import { TagInput } from './TagInput';
import {
  ALLERGY_SUGGESTIONS,
  CUISINE_SUGGESTIONS,
  DIET_OPTIONS,
  DISLIKE_SUGGESTIONS,
  FOOD_SUGGESTIONS,
  INTOLERANCE_SUGGESTIONS,
  ONBOARDING_STRINGS,
  YES_NO_OPTIONS,
} from '../../constants/onboarding';
import type { DietType, FoodPreferences, StepProps } from '../../types/onboarding';

const S = ONBOARDING_STRINGS.steps.food;

/** Diet type, allergies and tastes. Every question can be skipped. */
export function StepFood({ data, onChange }: StepProps) {
  const prefs = data.food_preferences;

  function update(patch: Partial<FoodPreferences>) {
    onChange({ food_preferences: { ...prefs, ...patch } });
  }

  function setDiet(diet: DietType | undefined) {
    // Egg and dairy answers follow from some diet types, so they aren't asked twice.
    const implied: Partial<FoodPreferences> =
      diet === 'vegan'
        ? { eats_eggs: false, eats_dairy: false }
        : diet === 'eggetarian' || diet === 'non_vegetarian'
          ? { eats_eggs: true }
          : diet === 'vegetarian' || diet === 'jain'
            ? { eats_eggs: false }
            : {};
    update({ diet_type: diet, ...implied });
  }

  const askDairy = prefs.diet_type !== undefined && prefs.diet_type !== 'vegan';

  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} />
      <Typography variant="body2" color="text.secondary">
        {ONBOARDING_STRINGS.optionalHint}
      </Typography>
      <ChoiceChips<DietType> label={S.dietType} options={DIET_OPTIONS} value={prefs.diet_type} onChange={setDiet} />
      {askDairy && (
        <ChoiceChips<boolean>
          label={S.eatsDairy}
          options={YES_NO_OPTIONS}
          value={prefs.eats_dairy}
          onChange={(eats_dairy) => update({ eats_dairy })}
        />
      )}
      <TagInput
        label={S.allergies}
        placeholder={S.tagPlaceholder}
        suggestions={ALLERGY_SUGGESTIONS}
        value={prefs.allergies}
        onChange={(allergies) => update({ allergies })}
      />
      <TagInput
        label={S.intolerances}
        placeholder={S.tagPlaceholder}
        suggestions={INTOLERANCE_SUGGESTIONS}
        value={prefs.intolerances}
        onChange={(intolerances) => update({ intolerances })}
      />
      <TagInput
        label={S.cuisines}
        placeholder={S.tagPlaceholder}
        suggestions={CUISINE_SUGGESTIONS}
        value={prefs.cuisines}
        onChange={(cuisines) => update({ cuisines })}
      />
      <TagInput
        label={S.likes}
        placeholder={S.tagPlaceholder}
        suggestions={FOOD_SUGGESTIONS}
        value={prefs.likes}
        onChange={(likes) => update({ likes })}
        excluded={prefs.dislikes}
      />
      <TagInput
        label={S.dislikes}
        placeholder={S.tagPlaceholder}
        suggestions={DISLIKE_SUGGESTIONS}
        value={prefs.dislikes}
        onChange={(dislikes) => update({ dislikes })}
        excluded={prefs.likes}
      />
    </Stack>
  );
}
