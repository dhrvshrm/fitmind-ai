import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutrition';
import { useUpdateMeal } from '../../hooks/queries/useNutritionQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { Meal, MealType } from '../../types/nutrition';
import { editMealDialogStyles as styles } from './EditMealDialog.styles';

const S = STRINGS.nutrition.mealActions;
const F = STRINGS.nutrition.form;
const R = STRINGS.nutrition.review;

type NumberField = 'calories' | 'protein' | 'carbs' | 'fats' | 'fiber';

const NUMBER_FIELDS: { key: NumberField; label: string }[] = [
  { key: 'calories', label: F.calories },
  { key: 'protein', label: F.protein },
  { key: 'carbs', label: F.carbs },
  { key: 'fats', label: F.fats },
  { key: 'fiber', label: S.fiber },
];

type EditMealDialogProps = {
  meal: Meal;
  onClose: () => void;
};

/** Edit a logged meal's name, totals, type and time. Changes are audited server-side. */
export function EditMealDialog({ meal, onClose }: EditMealDialogProps) {
  const [name, setName] = useState(meal.name);
  const [values, setValues] = useState<Record<NumberField, string>>({
    calories: String(meal.calories),
    protein: String(meal.protein),
    carbs: String(meal.carbs),
    fats: String(meal.fats),
    fiber: String(meal.fiber ?? 0),
  });
  const [mealType, setMealType] = useState<MealType | undefined>(meal.meal_type ?? undefined);
  const [eatenAt, setEatenAt] = useState(meal.eaten_at ?? '');
  const updateMeal = useUpdateMeal();

  const invalid =
    !name.trim() || NUMBER_FIELDS.some(({ key }) => values[key] === '' || Number(values[key]) < 0);

  function handleSave() {
    updateMeal.mutate(
      {
        id: meal.id,
        payload: {
          name: name.trim(),
          calories: Number(values.calories),
          protein: Number(values.protein),
          carbs: Number(values.carbs),
          fats: Number(values.fats),
          fiber: Number(values.fiber),
          meal_type: mealType,
          eaten_at: eatenAt || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(S.updated);
          onClose();
        },
        onError: (error) => toast.error(resolveApiError(error, S.error)),
      },
    );
  }

  return (
    <Dialog open onClose={updateMeal.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{S.editTitle}</DialogTitle>
      <DialogContent>
        <Stack sx={styles.fields}>
          <TextField label={F.name} value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <Box sx={styles.numbers}>
            {NUMBER_FIELDS.map(({ key, label }) => (
              <TextField
                key={key}
                label={label}
                type="number"
                value={values[key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                slotProps={{ htmlInput: { min: 0 } }}
              />
            ))}
            <TextField
              label={R.eatenAt}
              type="time"
              value={eatenAt}
              onChange={(e) => setEatenAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
          <Stack sx={styles.typeRow}>
            {MEAL_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = mealType === option.value;
              return (
                <Chip
                  key={option.value}
                  icon={<Icon />}
                  label={option.label}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  onClick={() => setMealType(option.value)}
                />
              );
            })}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={styles.actions}>
        <Button color="inherit" onClick={onClose} disabled={updateMeal.isPending}>
          {S.cancel}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={invalid || updateMeal.isPending}>
          {S.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
