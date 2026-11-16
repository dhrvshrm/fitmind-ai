import { Stack, TextField, Typography } from "@mui/material";
import { StepHeader } from "./StepHeader";
import { ChoiceChips } from "./ChoiceChips";
import { TagInput } from "./TagInput";
import {
  BUDGET_OPTIONS,
  COOK_OPTIONS,
  COUNTRY_OPTIONS,
  EAT_OUT_OPTIONS,
  ONBOARDING_STRINGS,
  PANTRY_SUGGESTIONS,
  YES_NO_OPTIONS,
} from "../../constants/onboarding";
import type {
  Cook,
  EatOutFrequency,
  FoodAccess,
  StepProps,
} from "../../types/onboarding";
import { MESS_MEALS } from "../../constants/mess";
import { MessSetupFields } from "../mess/MessSetupFields";

const S = ONBOARDING_STRINGS.steps.access;

/** What the person can realistically eat: who cooks, budget and what's at home. */
export function StepAccess({ data, onChange }: StepProps) {
  const access = data.food_access;

  function update(patch: Partial<FoodAccess>) {
    onChange({ food_access: { ...access, ...patch } });
  }

  // Eating at a PG or hostel mess: which meals it serves and what's on the shelf,
  // so the first plan is built around the mess (all three meals to start with).
  const atMess = access.who_cooks === "mess_or_canteen";

  function chooseCook(who_cooks: Cook | undefined) {
    const mess = who_cooks === "mess_or_canteen";
    update({
      who_cooks,
      mess_meals: mess
        ? access.mess_meals?.length
          ? access.mess_meals
          : [...MESS_MEALS]
        : [],
    });
  }

  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} />
      <Typography variant="body2" color="text.secondary">
        {ONBOARDING_STRINGS.optionalHint}
      </Typography>
      <ChoiceChips<string>
        label={S.country}
        options={COUNTRY_OPTIONS}
        value={access.country ?? 'India'}
        onChange={(country) => update({ country })}
      />
      <ChoiceChips<Cook>
        label={S.whoCooks}
        options={COOK_OPTIONS}
        value={access.who_cooks}
        onChange={chooseCook}
      />
      {atMess && (
        <MessSetupFields
          value={{
            mess_meals: access.mess_meals ?? [],
            shelf: access.shelf ?? [],
          }}
          onChange={(setup) => update(setup)}
          dietType={data.food_preferences?.diet_type}
        />
      )}
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
      {!atMess && (
        <TagInput
          label={S.pantry}
          placeholder={ONBOARDING_STRINGS.steps.food.tagPlaceholder}
          suggestions={PANTRY_SUGGESTIONS}
          value={access.pantry}
          onChange={(pantry) => update({ pantry })}
        />
      )}
      <ChoiceChips<boolean>
        label={S.openToNew}
        options={YES_NO_OPTIONS}
        value={access.open_to_new_ingredients}
        onChange={(open_to_new_ingredients) =>
          update({ open_to_new_ingredients })
        }
      />
      <TextField
        label={S.region}
        helperText={S.regionHint}
        value={access.region ?? ""}
        onChange={(e) => update({ region: e.target.value || undefined })}
        slotProps={{ htmlInput: { maxLength: 60 } }}
      />
    </Stack>
  );
}
