import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { CheckCircleRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { recoveryService } from '../../services/recoveryService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import type { RecoveryLogPayload, RecoveryLogResult } from '../../types/recovery';
import { recoveryLogFormStyles as styles } from './RecoveryLogForm.styles';

const S = STRINGS.recovery.form;

/** Slider bounds; ratings share the backend's 1–5 scale. */
const SLEEP_MAX = 12;
const RATING_MARKS = [1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }));
const SLEEP_MARKS = [0, 4, 8, 12].map((value) => ({ value, label: `${value}h` }));

const DEFAULTS: RecoveryLogPayload = {
  sleep_hours: 8,
  sleep_quality: 3,
  stress_level: 3,
  muscle_soreness: 3,
};

type SliderFieldProps = {
  label: string;
  hint?: string;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  marks: { value: number; label: string }[];
  disabled: boolean;
};

/** One labeled slider row: label + live value, hint, and the slider itself. */
function SliderField({
  label,
  hint,
  value,
  displayValue,
  onChange,
  min,
  max,
  step,
  marks,
  disabled,
}: SliderFieldProps) {
  return (
    <Box sx={styles.fieldRow}>
      <Stack sx={styles.labelRow}>
        <Typography variant="body2" sx={styles.label}>
          {label}
        </Typography>
        <Typography variant="body2" sx={styles.value}>
          {displayValue}
        </Typography>
      </Stack>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
      <Slider
        value={value}
        onChange={(_e, next) => onChange(next as number)}
        min={min}
        max={max}
        step={step}
        marks={marks}
        valueLabelDisplay="auto"
        disabled={disabled}
        sx={styles.slider}
      />
    </Box>
  );
}

type RecoveryLogFormProps = {
  /** True when today's check-in already exists — locks the form. */
  alreadyLogged: boolean;
  /** Called with the fresh result after a successful log. */
  onLogged: (result: RecoveryLogResult) => void;
};

export function RecoveryLogForm({ alreadyLogged, onLogged }: RecoveryLogFormProps) {
  const [form, setForm] = useState<RecoveryLogPayload>(DEFAULTS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function patch(field: keyof RecoveryLogPayload) {
    return (value: number) => setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const result = await recoveryService.logRecovery(form);
      toast.success(S.success);
      onLogged(result);
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (alreadyLogged) {
    return (
      <Paper variant="outlined" sx={styles.card}>
        <Typography variant="h6" sx={styles.title}>
          {S.title}
        </Typography>
        <Box sx={styles.donePanel}>
          <CheckCircleRounded sx={styles.doneIcon} />
          <Typography variant="h6" sx={styles.doneTitle}>
            {S.alreadyDoneTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.alreadyDoneBody}
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      <SliderField
        label={S.sleepHours}
        value={form.sleep_hours}
        displayValue={`${form.sleep_hours}h`}
        onChange={patch('sleep_hours')}
        min={0}
        max={SLEEP_MAX}
        step={0.5}
        marks={SLEEP_MARKS}
        disabled={isSubmitting}
      />
      <SliderField
        label={S.sleepQuality}
        hint={S.qualityHint}
        value={form.sleep_quality}
        displayValue={String(form.sleep_quality)}
        onChange={patch('sleep_quality')}
        min={1}
        max={5}
        step={1}
        marks={RATING_MARKS}
        disabled={isSubmitting}
      />
      <SliderField
        label={S.stressLevel}
        hint={S.stressHint}
        value={form.stress_level}
        displayValue={String(form.stress_level)}
        onChange={patch('stress_level')}
        min={1}
        max={5}
        step={1}
        marks={RATING_MARKS}
        disabled={isSubmitting}
      />
      <SliderField
        label={S.muscleSoreness}
        hint={S.sorenessHint}
        value={form.muscle_soreness}
        displayValue={String(form.muscle_soreness)}
        onChange={patch('muscle_soreness')}
        min={1}
        max={5}
        step={1}
        marks={RATING_MARKS}
        disabled={isSubmitting}
      />

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleSubmit}
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
        sx={styles.submit}
      >
        {isSubmitting ? S.submitting : S.submit}
      </Button>
    </Paper>
  );
}
