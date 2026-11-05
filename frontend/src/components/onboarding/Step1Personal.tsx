import { Box, Chip, FormHelperText, Stack, TextField, Typography } from '@mui/material';
import { StepHeader } from './StepHeader';
import { OptionSelector } from './OptionSelector';
import { HeightField } from '../ui/HeightField';
import { ChoiceChips } from './ChoiceChips';
import { GENDER_OPTIONS, ONBOARDING_STRINGS, REPRODUCTIVE_OPTIONS } from '../../constants/onboarding';
import { computeBmi, toNumberOrEmpty } from '../../utils/onboarding';
import type { Gender, ReproductiveStatus, StepProps } from '../../types/onboarding';
import { step1PersonalStyles as styles } from './Step1Personal.styles';

const S = ONBOARDING_STRINGS.steps.personal;

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
      </Stack>

      <HeightField
        value={data.height_cm}
        onChange={(height_cm) => onChange({ height_cm })}
        error={Boolean(errors.height_cm)}
        helperText={errors.height_cm}
      />

      <Box>
        <Typography variant="subtitle2" sx={styles.genderLabel}>
          {S.fields.gender}
        </Typography>
        <OptionSelector<Gender>
          options={GENDER_OPTIONS}
          value={data.gender}
          onChange={(gender) =>
            // The pregnancy question only applies when female is selected.
            onChange(gender === 'female' ? { gender } : { gender, reproductive_status: '' })
          }
          columns={3}
        />
        {errors.gender && (
          <FormHelperText error sx={styles.genderError}>
            {errors.gender}
          </FormHelperText>
        )}
      </Box>

      {data.gender === 'female' && (
        <Box>
          <ChoiceChips<ReproductiveStatus>
            label={S.fields.reproductive}
            options={REPRODUCTIVE_OPTIONS}
            value={data.reproductive_status}
            onChange={(value) => onChange({ reproductive_status: value ?? '' })}
          />
          <Typography variant="caption" color="text.secondary" sx={styles.hint}>
            {S.fields.reproductiveHint}
          </Typography>
        </Box>
      )}

      <TextField
        label={S.fields.bodyFat}
        type="number"
        fullWidth
        value={data.body_fat_percent}
        onChange={(e) => onChange({ body_fat_percent: toNumberOrEmpty(e.target.value) })}
        error={Boolean(errors.body_fat_percent)}
        helperText={errors.body_fat_percent ?? S.fields.bodyFatHint}
        slotProps={{ htmlInput: { min: 3, max: 60, step: 0.5 } }}
      />

      {bmi && (
        <Box sx={styles.bmiBox}>
          <Box>
            <Typography variant="subtitle2">{S.bmiLabel}</Typography>
            <Typography variant="caption" color="text.secondary">
              {S.bmiHint}
            </Typography>
          </Box>
          <Chip
            label={S.bmiValue(bmi.value, bmi.category)}
            color={bmi.color}
            sx={styles.bmiChip}
          />
        </Box>
      )}
    </Stack>
  );
}
