import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutrition';
import { useLogMeal } from '../../hooks/queries/useNutritionQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { EstimatedItem, MealEstimate, MealType } from '../../types/nutrition';
import {
  currentTimeHHMM,
  mealNameFrom,
  mealTypeForTime,
  sumNutrients,
  toMealItems,
} from '../../utils/nutrition';
import { EstimatedItemRow } from './EstimatedItemRow';
import { estimateReviewStyles as styles } from './EstimateReview.styles';

const S = STRINGS.nutrition.review;
const F = STRINGS.nutrition.form;

type EstimateReviewProps = {
  estimate: MealEstimate;
  onDone: () => void;
};

/** Review step: fix quantities or foods, then save the meal with its items. */
export function EstimateReview({ estimate, onDone }: EstimateReviewProps) {
  const [items, setItems] = useState<EstimatedItem[]>(estimate.items);
  const [name, setName] = useState(() => mealNameFrom(estimate.text));
  const [mealType, setMealType] = useState<MealType>(() => mealTypeForTime());
  const [eatenAt, setEatenAt] = useState(() => currentTimeHHMM());
  const logMeal = useLogMeal();

  const total = sumNutrients(items.map((i) => i.nutrients));
  const canSave = items.some((i) => i.nutrients && i.nutrients.kcal > 0) && name.trim().length > 0;

  function updateItem(index: number, next: EstimatedItem) {
    setItems((prev) => prev.map((item, i) => (i === index ? next : item)));
  }

  async function handleSave() {
    if (!canSave) {
      toast.error(S.nothingToSave);
      return;
    }
    try {
      const result = await logMeal.mutateAsync({
        name: name.trim(),
        calories: total.kcal,
        protein: total.protein,
        carbs: total.carbs,
        fats: total.fat,
        fiber: total.fiber,
        meal_type: mealType,
        eaten_at: eatenAt || null,
        items: toMealItems(items),
      });
      toast.success(result.xp_earned > 0 ? `${F.success} ${F.xpToast(result.xp_earned)}` : F.success);
      if (result.leveled_up) toast.success(F.levelUpToast(result.new_level));
      onDone();
    } catch (error) {
      toast.error(resolveApiError(error, F.error));
    }
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={styles.subtitle}>
        {S.subtitle}
      </Typography>

      <Box>
        {items.map((item, index) => (
          <EstimatedItemRow
            key={`${item.query}-${index}`}
            item={item}
            onChange={(next) => updateItem(index, next)}
            onRemove={() => setItems((prev) => prev.filter((_, i) => i !== index))}
            disabled={logMeal.isPending}
          />
        ))}
      </Box>

      <Stack sx={styles.totalRow}>
        <Typography variant="subtitle2">{S.total}</Typography>
        <Box sx={styles.totalNumbers}>
          <Typography variant="h6" component="p" sx={styles.totalKcal}>
            {S.kcal(total.kcal)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {S.macros(total.protein, total.carbs, total.fat, total.fiber)}
          </Typography>
        </Box>
      </Stack>

      <Stack sx={styles.fields}>
        <TextField
          size="small"
          label={S.mealNameLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={logMeal.isPending}
          sx={styles.nameField}
        />
        <TextField
          size="small"
          type="time"
          label={S.eatenAt}
          value={eatenAt}
          onChange={(e) => setEatenAt(e.target.value)}
          disabled={logMeal.isPending}
          sx={styles.timeField}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

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
              disabled={logMeal.isPending}
            />
          );
        })}
      </Stack>

      <Stack sx={styles.buttons}>
        <Button color="inherit" onClick={onDone} disabled={logMeal.isPending}>
          {S.startOver}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={logMeal.isPending || !canSave}
          startIcon={logMeal.isPending ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {logMeal.isPending ? S.saving : S.save}
        </Button>
      </Stack>
    </Box>
  );
}
