import { Autocomplete, Chip, Stack, TextField } from "@mui/material";
import { StepHeader } from "./StepHeader";
import {
  INJURY_SUGGESTIONS,
  ONBOARDING_STRINGS,
} from "../../constants/onboarding";
import type { StepProps } from "../../types/onboarding";

const S = ONBOARDING_STRINGS.steps.injuries;

export function Step5Injuries({ data, onChange }: StepProps) {
  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} helper={S.helper} />
      <Autocomplete<string, true, false, true>
        multiple
        freeSolo
        options={INJURY_SUGGESTIONS}
        value={data.injuries}
        onChange={(_event, newValue) => onChange({ injuries: newValue })}
        renderValue={(value, getItemProps) =>
          value.map((option, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            return <Chip key={key} label={option} {...itemProps} />;
          })
        }
        renderInput={(params) => (
          <TextField {...params} placeholder={S.placeholder} />
        )}
      />
    </Stack>
  );
}
