import { useState } from 'react';
import { Box, Button, Card, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutrition';
import { useLogMeals } from '../../hooks/queries/useNutritionQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { EstimatedItem, MealEstimate, MealPayload } from '../../types/nutrition';
import {
  groupByMeal,
  mealTypeForTime,
  nameFromItems,
  sumNutrients,
  toMealItems,
  type MealGroup,
} from '../../utils/nutrition';
import { EstimatedItemRow } from './EstimatedItemRow';
import { dayReviewStyles as styles } from './DayReview.styles';

const S = STRINGS.nutrition.review;
const F = STRINGS.nutrition.form;

type DayReviewProps = {
  estimate: MealEstimate;
  onDone: () => void;
};

function hasValues(group: MealGroup): boolean {
  return group.items.some((i) => i.nutrients && i.nutrients.kcal > 0);
}

function toPayload(group: MealGroup): MealPayload {
  const total = sumNutrients(group.items.map((i) => i.nutrients));
  return {
    name: nameFromItems(group.items),
    calories: total.kcal,
    protein: total.protein,
    carbs: total.carbs,
    fats: total.fat,
    fiber: total.fiber,
    meal_type: group.mealType,
    eaten_at: group.eatenAt || null,
    items: toMealItems(group.items),
  };
}

/** Review for a whole day described at once: one card per meal, saved together. */
export function DayReview({ estimate, onDone }: DayReviewProps) {
  const [groups, setGroups] = useState<MealGroup[]>(() =>
    groupByMeal(estimate.items, mealTypeForTime()),
  );
  const logMeals = useLogMeals();

  const dayTotal = sumNutrients(groups.flatMap((g) => g.items.map((i) => i.nutrients)));
  const savable = groups.filter(hasValues);

  function updateGroup(index: number, update: (group: MealGroup) => MealGroup) {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? update(g) : g)).filter((g) => g.items.length > 0),
    );
  }

  function updateItem(groupIndex: number, itemIndex: number, next: EstimatedItem) {
    updateGroup(groupIndex, (g) => ({
      ...g,
      items: g.items.map((item, i) => (i === itemIndex ? next : item)),
    }));
  }

  function removeItem(groupIndex: number, itemIndex: number) {
    updateGroup(groupIndex, (g) => ({ ...g, items: g.items.filter((_, i) => i !== itemIndex) }));
  }

  async function handleSave() {
    if (savable.length === 0) {
      toast.error(S.nothingToSave);
      return;
    }
    try {
      const result = await logMeals.mutateAsync(savable.map(toPayload));
      const saved = S.savedAll(result.meals.length);
      toast.success(result.xp_earned > 0 ? `${saved} ${F.xpToast(result.xp_earned)}` : saved);
      if (result.leveled_up) toast.success(F.levelUpToast(result.new_level));
      onDone();
    } catch (error) {
      toast.error(resolveApiError(error, F.error));
    }
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={styles.subtitle}>
        {S.wholeDayHint}
      </Typography>

      <Stack sx={styles.groups}>
        {groups.map((group, groupIndex) => {
          const option = MEAL_TYPE_OPTIONS.find((o) => o.value === group.mealType);
          const Icon = option?.icon;
          const total = sumNutrients(group.items.map((i) => i.nutrients));
          return (
            <Card key={group.mealType} sx={styles.group}>
              <Stack sx={styles.groupHeader}>
                <Stack sx={styles.groupTitle}>
                  {Icon && <Icon fontSize="small" color="primary" />}
                  <Typography variant="subtitle1">{option?.label}</Typography>
                </Stack>
                <TextField
                  size="small"
                  type="time"
                  label={S.eatenAt}
                  value={group.eatenAt}
                  onChange={(e) => updateGroup(groupIndex, (g) => ({ ...g, eatenAt: e.target.value }))}
                  disabled={logMeals.isPending}
                  sx={styles.time}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
              {group.items.map((item, itemIndex) => (
                <EstimatedItemRow
                  key={`${item.query}-${itemIndex}`}
                  item={item}
                  onChange={(next) => updateItem(groupIndex, itemIndex, next)}
                  onRemove={() => removeItem(groupIndex, itemIndex)}
                  disabled={logMeals.isPending}
                />
              ))}
              <Stack sx={styles.groupTotal}>
                <Typography variant="body2" color="text.secondary">
                  {S.mealTotal}
                </Typography>
                <Typography variant="subtitle2" sx={styles.number}>
                  {S.kcal(total.kcal)}
                </Typography>
              </Stack>
            </Card>
          );
        })}
      </Stack>

      <Stack sx={styles.dayTotal}>
        <Typography variant="subtitle2">{S.dayTotal}</Typography>
        <Box sx={styles.dayNumbers}>
          <Typography variant="h6" component="p" sx={styles.number}>
            {S.kcal(dayTotal.kcal)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {S.macros(dayTotal.protein, dayTotal.carbs, dayTotal.fat, dayTotal.fiber)}
          </Typography>
        </Box>
      </Stack>

      <Stack sx={styles.buttons}>
        <Button color="inherit" onClick={onDone} disabled={logMeals.isPending}>
          {S.startOver}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={logMeals.isPending || savable.length === 0}
          startIcon={logMeals.isPending ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {logMeals.isPending ? S.saving : S.saveAll(savable.length)}
        </Button>
      </Stack>
    </Box>
  );
}
