import { useState } from 'react';
import { Box, FormHelperText, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { usePreferencesStore, type HeightUnit } from '../../store/preferencesStore';
import { cmToFeetInches, feetInchesToCm } from '../../utils/height';
import { heightFieldStyles as styles } from './HeightField.styles';

const S = STRINGS.ui.height;

type HeightFieldProps = {
  /** Height in cm, or '' when not entered. */
  value: number | '';
  onChange: (cm: number | '') => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
};

function initialParts(cm: number | ''): { feet: string; inches: string } {
  if (cm === '' || !(cm > 0)) return { feet: '', inches: '' };
  const { feet, inches } = cmToFeetInches(cm);
  return { feet: String(feet), inches: String(inches) };
}

/**
 * Height input in cm or feet and inches (e.g. 5 ft 6.6 in). Always reports
 * cm, which is what the app stores; the chosen unit is remembered per device.
 */
export function HeightField({ value, onChange, error = false, helperText, disabled = false }: HeightFieldProps) {
  const unit = usePreferencesStore((s) => s.heightUnit);
  const setUnit = usePreferencesStore((s) => s.setHeightUnit);
  const [parts, setParts] = useState(() => initialParts(value));

  function updateParts(next: { feet: string; inches: string }) {
    setParts(next);
    if (next.feet.trim() === '' && next.inches.trim() === '') {
      onChange('');
      return;
    }
    const feet = Number(next.feet) || 0;
    const inches = Number(next.inches) || 0;
    onChange(feet || inches ? feetInchesToCm(feet, inches) : '');
  }

  function changeUnit(nextUnit: HeightUnit | null) {
    if (!nextUnit) return;
    if (nextUnit === 'ftin') setParts(initialParts(value));
    setUnit(nextUnit);
  }

  return (
    <Box sx={styles.root}>
      <Stack sx={styles.header}>
        <Typography variant="body2" color="text.secondary">
          {S.label}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={unit}
          onChange={(_, next: HeightUnit | null) => changeUnit(next)}
          aria-label={S.unitAria}
          disabled={disabled}
        >
          <ToggleButton value="ftin" sx={styles.toggle}>
            {S.ftIn}
          </ToggleButton>
          <ToggleButton value="cm" sx={styles.toggle}>
            {S.cm}
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {unit === 'cm' ? (
        <TextField
          fullWidth
          type="number"
          label={S.cmLabel}
          value={value}
          onChange={(e) => onChange(e.target.value.trim() === '' ? '' : Number(e.target.value))}
          error={error}
          disabled={disabled}
          slotProps={{ htmlInput: { min: 100, max: 250, step: 0.1 } }}
        />
      ) : (
        <Stack sx={styles.feetRow}>
          <TextField
            fullWidth
            type="number"
            label={S.feet}
            value={parts.feet}
            onChange={(e) => updateParts({ ...parts, feet: e.target.value })}
            error={error}
            disabled={disabled}
            slotProps={{ htmlInput: { min: 3, max: 8, step: 1 } }}
          />
          <TextField
            fullWidth
            type="number"
            label={S.inches}
            value={parts.inches}
            onChange={(e) => updateParts({ ...parts, inches: e.target.value })}
            error={error}
            disabled={disabled}
            slotProps={{ htmlInput: { min: 0, max: 11.9, step: 0.1 } }}
          />
        </Stack>
      )}

      {(helperText || (unit === 'ftin' && value !== '')) && (
        <FormHelperText error={error} sx={styles.helper}>
          {helperText ?? S.converted(value as number)}
        </FormHelperText>
      )}
    </Box>
  );
}
