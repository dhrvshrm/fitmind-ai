import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { CheckCircleRounded } from "@mui/icons-material";
import toast from "react-hot-toast";
import { useLogRecovery } from "../../hooks/queries/useRecoveryQueries";
import { resolveApiError } from "../../lib/apiClient";
import { STRINGS } from "../../constants/strings";
import type { RecoveryLogPayload } from "../../types/recovery";
import { SectionCard } from "../ui/SectionCard";
import { IconBadge } from "../ui/IconBadge";
import { recoveryLogFormStyles as styles } from "./RecoveryLogForm.styles";

const S = STRINGS.recovery.form;

/** Slider bounds; ratings share the backend's 1 to 5 scale. */
const SLEEP_MAX = 12;
const RATING_MARKS = [1, 2, 3, 4, 5].map((value) => ({
  value,
  label: String(value),
}));
const SLEEP_MARKS = [0, 4, 8, 12].map((value) => ({
  value,
  label: S.hoursValue(value),
}));

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
        aria-label={label}
      />
    </Box>
  );
}

type RecoveryLogFormProps = {
  /** True when today's check-in already exists; locks the form. */
  alreadyLogged: boolean;
};

/** Daily recovery check-in. Logging refreshes the score, history and dashboard. */
export function RecoveryLogForm({ alreadyLogged }: RecoveryLogFormProps) {
  const [form, setForm] = useState<RecoveryLogPayload>(DEFAULTS);
  const logRecovery = useLogRecovery();
  const isSubmitting = logRecovery.isPending;

  function patch(field: keyof RecoveryLogPayload) {
    return (value: number) => setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    try {
      await logRecovery.mutateAsync(form);
      toast.success(S.success);
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    }
  }

  if (alreadyLogged) {
    return (
      <SectionCard title={S.title}>
        <Box sx={styles.donePanel}>
          <IconBadge icon={CheckCircleRounded} tone="success" size="large" />
          <Typography variant="subtitle1" sx={styles.doneTitle}>
            {S.alreadyDoneTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.alreadyDoneBody}
          </Typography>
        </Box>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={S.title}>
      <SliderField
        label={S.sleepHours}
        value={form.sleep_hours}
        displayValue={S.hoursValue(form.sleep_hours)}
        onChange={patch("sleep_hours")}
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
        onChange={patch("sleep_quality")}
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
        onChange={patch("stress_level")}
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
        onChange={patch("muscle_soreness")}
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
        startIcon={
          isSubmitting ? <CircularProgress size={18} color="inherit" /> : null
        }
        sx={styles.submit}
      >
        {isSubmitting ? S.submitting : S.submit}
      </Button>
    </SectionCard>
  );
}
