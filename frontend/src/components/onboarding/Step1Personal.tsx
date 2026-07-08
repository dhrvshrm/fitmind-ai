import { Box, Chip, FormHelperText, Stack, TextField, Typography } from '@mui/material';
import { StepHeader } from './StepHeader';
import { OptionSelector } from './OptionSelector';
import { GENDER_OPTIONS, ONBOARDING_STRINGS } from '../../constants/onboarding';
import { computeBmi } from '../../utils/onboarding';
import type { Gender, StepProps } from '../../types/onboarding';
import { step1PersonalStyles as styles } from './Step1Personal.styles';

const S = ONBOARDING_STRINGS.steps.personal;

/** Parses a numeric input into `number | ''` so empty stays empty. */
function toNumberOrEmpty(raw: string): number | '' {
  if (raw.trim() === '') return '';
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? '' : parsed;
}

export function Step1Personal({ data, errors, onChange }: StepProps) {
  const bmi = computeBmi(data.weight_kg, data.height_cm);

  return (
    <Stack spacing={2.5}>
      <StepHeader title={S.title} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={S.fields.age}
          type="number"
          fullWidth
          value={data.age}
          onChange={(e) => onChange({ age: toNumberOrEmpty(e.target.value) })}
          error={Boolean(errors.age)}
          helperText={errors.age}
          slotProps={{ htmlInput: { min: 13, max: 100 } }}
        />
        <TextField
          label={S.fields.weight}
          type="number"
          fullWidth
          value={data.weight_kg}
          onChange={(e) => onChange({ weight_kg: toNumberOrEmpty(e.target.value) })}
          error={Boolean(errors.weight_kg)}
          helperText={errors.weight_kg}
          slotProps={{ htmlInput: { min: 30, max: 300, step: 0.1 } }}
        />
        <TextField
          label={S.fields.height}
          type="number"
          fullWidth
          value={data.height_cm}
          onChange={(e) => onChange({ height_cm: toNumberOrEmpty(e.target.value) })}
          error={Boolean(errors.height_cm)}
          helperText={errors.height_cm}
          slotProps={{ htmlInput: { min: 100, max: 250, step: 0.1 } }}
        />
      </Stack>

      <Box>
        <Typography variant="subtitle2" sx={styles.genderLabel}>
          {S.fields.gender}
        </Typography>
        <OptionSelector<Gender>
          options={GENDER_OPTIONS}
          value={data.gender}
          onChange={(gender) => onChange({ gender })}
          columns={3}
        />
        {errors.gender && (
          <FormHelperText error sx={styles.genderError}>
            {errors.gender}
          </FormHelperText>
        )}
      </Box>

      {bmi && (
        <Box sx={styles.bmiBox}>
          <Box>
            <Typography variant="subtitle2">{S.bmiLabel}</Typography>
            <Typography variant="caption" color="text.secondary">
              {S.bmiHint}
            </Typography>
          </Box>
          <Chip
            label={`${bmi.value} · ${bmi.category}`}
            color={bmi.color}
            sx={styles.bmiChip}
          />
        </Box>
      )}
    </Stack>
  );
}
