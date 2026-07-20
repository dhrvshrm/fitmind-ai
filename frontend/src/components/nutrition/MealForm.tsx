import { useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { nutritionService } from '../../services/nutritionService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { KCAL_PER_GRAM, MEAL_TYPE_OPTIONS } from '../../constants/nutrition';
import type { MealLogResult, MealType } from '../../types/nutrition';
import { mealFormStyles as styles } from './MealForm.styles';

const S = STRINGS.nutrition.form;

type NumericField = 'calories' | 'protein' | 'carbs' | 'fats';

type FormState = {
  name: string;
  calories: number | '';
  protein: number | '';
  carbs: number | '';
  fats: number | '';
  meal_type: MealType;
};

type FieldErrors = Partial<Record<'name' | NumericField, string>>;

const INITIAL_FORM: FormState = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  meal_type: 'breakfast',
};

/** Parses a numeric input into `number | ''` so empty stays empty. */
function toNumberOrEmpty(raw: string): number | '' {
  if (raw.trim() === '') return '';
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? '' : parsed;
}

type MealFormProps = {
  /** Called after a successful log so the page can refresh the summary. */
  onLogged: (result: MealLogResult) => void;
};

export function MealForm({ onLogged }: MealFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Real-time kcal estimate from the macro grams (Atwater factors). */
  const estimatedKcal = Math.round(
    (Number(form.protein) || 0) * KCAL_PER_GRAM.protein +
      (Number(form.carbs) || 0) * KCAL_PER_GRAM.carbs +
      (Number(form.fats) || 0) * KCAL_PER_GRAM.fats,
  );

  function setNumeric(field: NumericField) {
    return (raw: string) => {
      setForm((prev) => ({ ...prev, [field]: toNumberOrEmpty(raw) }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!form.name.trim()) next.name = S.validation.nameRequired;
    if (form.calories === '' || form.calories < 0) {
      next.calories = S.validation.caloriesRequired;
    }
    for (const field of ['protein', 'carbs', 'fats'] as const) {
      const value = form[field];
      if (value !== '' && value < 0) next[field] = S.validation.macroInvalid;
    }
    setErrors(next);
    return Object.values(next).every((message) => !message);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await nutritionService.logMeal({
        name: form.name.trim(),
        calories: Number(form.calories),
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fats: Number(form.fats) || 0,
        meal_type: form.meal_type,
      });
      toast.success(`${S.success} ${S.xpToast(result.xp_earned)}`);
      if (result.leveled_up) toast.success(S.levelUpToast(result.new_level));
      setForm((prev) => ({ ...INITIAL_FORM, meal_type: prev.meal_type }));
      onLogged(result);
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label={S.name}
            fullWidth
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }));
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={Boolean(errors.name)}
            helperText={errors.name}
            disabled={isSubmitting}
          />

          <TextField
            label={S.calories}
            type="number"
            fullWidth
            value={form.calories}
            onChange={(e) => setNumeric('calories')(e.target.value)}
            error={Boolean(errors.calories)}
            helperText={errors.calories}
            disabled={isSubmitting}
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
          />

          <Box sx={styles.macroRow}>
            {(['protein', 'carbs', 'fats'] as const).map((field) => (
              <TextField
                key={field}
                label={S[field]}
                type="number"
                value={form[field]}
                onChange={(e) => setNumeric(field)(e.target.value)}
                error={Boolean(errors[field])}
                helperText={errors[field]}
                disabled={isSubmitting}
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            ))}
          </Box>

          {/* Live estimate keeps calories honest as macros are typed. */}
          <Stack sx={styles.estimateRow}>
            {estimatedKcal > 0 && (
              <>
                <Typography variant="caption" color="text.secondary">
                  {S.estimate(estimatedKcal)}
                </Typography>
                <Chip
                  label={S.useEstimate}
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => setForm((prev) => ({ ...prev, calories: estimatedKcal }))}
                  disabled={isSubmitting}
                />
              </>
            )}
          </Stack>

          <Box>
            <Typography variant="body2" sx={styles.typeLabel}>
              {S.mealType}
            </Typography>
            <Stack sx={styles.typeRow}>
              {MEAL_TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={`${option.icon} ${option.label}`}
                  color={form.meal_type === option.value ? 'primary' : 'default'}
                  variant={form.meal_type === option.value ? 'filled' : 'outlined'}
                  onClick={() => setForm((prev) => ({ ...prev, meal_type: option.value }))}
                  disabled={isSubmitting}
                />
              ))}
            </Stack>
          </Box>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
            sx={styles.submit}
          >
            {isSubmitting ? S.submitting : S.submit}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
