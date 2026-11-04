import { Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { BookmarkRounded, HistoryRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import {
  useDeleteSavedMeal,
  useLogMeal,
  useLogSavedMeal,
  useRecentMeals,
  useSavedMeals,
} from '../../hooks/queries/useNutritionQueries';
import { resolveApiError } from '../../lib/apiClient';
import type { RecentMeal, SavedMeal } from '../../types/nutrition';
import { currentTimeHHMM, mealTypeForTime } from '../../utils/nutrition';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { quickPicksStyles as styles } from './QuickPicks.styles';

const S = STRINGS.nutrition.picks;

/** One-tap re-logging of saved meals and meals from the last month. */
export function QuickPicks() {
  const saved = useSavedMeals();
  const recent = useRecentMeals();
  const logSaved = useLogSavedMeal();
  const logMeal = useLogMeal();
  const deleteSaved = useDeleteSavedMeal();
  const busy = logSaved.isPending || logMeal.isPending;

  function logSavedMeal(meal: SavedMeal) {
    logSaved.mutate(
      { id: meal.id, mealType: mealTypeForTime() },
      {
        onSuccess: () => toast.success(S.logged(meal.name)),
        onError: (error) => toast.error(resolveApiError(error, S.error)),
      },
    );
  }

  function logRecentMeal(meal: RecentMeal) {
    logMeal.mutate(
      {
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        fiber: meal.fiber,
        meal_type: mealTypeForTime(),
        eaten_at: currentTimeHHMM(),
        items: meal.items,
      },
      {
        onSuccess: () => toast.success(S.logged(meal.name)),
        onError: (error) => toast.error(resolveApiError(error, S.error)),
      },
    );
  }

  function removeSaved(meal: SavedMeal) {
    deleteSaved.mutate(meal.id, {
      onSuccess: () => toast.success(S.removedSaved),
      onError: (error) => toast.error(resolveApiError(error, S.error)),
    });
  }

  const loading = saved.isPending || recent.isPending;
  const savedMeals = saved.data ?? [];
  const recentMeals = recent.data ?? [];
  const empty = !loading && savedMeals.length === 0 && recentMeals.length === 0;

  return (
    <SectionCard title={S.title} subtitle={empty ? undefined : S.subtitle}>
      {loading && <Skeleton variant="rounded" sx={styles.skeleton} />}
      {empty && (
        <EmptyState icon={HistoryRounded} title={S.emptyTitle} description={S.empty} compact />
      )}

      {savedMeals.length > 0 && (
        <Box sx={styles.group}>
          <Typography variant="overline" color="text.secondary">
            {S.saved}
          </Typography>
          <Stack sx={styles.chips}>
            {savedMeals.map((meal) => (
              <Chip
                key={meal.id}
                icon={<BookmarkRounded />}
                label={S.chipLabel(meal.name, meal.totals.kcal)}
                onClick={() => logSavedMeal(meal)}
                onDelete={() => removeSaved(meal)}
                disabled={busy}
                variant="outlined"
                sx={styles.chip}
              />
            ))}
          </Stack>
        </Box>
      )}

      {recentMeals.length > 0 && (
        <Box sx={styles.group}>
          <Typography variant="overline" color="text.secondary">
            {S.recent}
          </Typography>
          <Stack sx={styles.chips}>
            {recentMeals.map((meal) => (
              <Chip
                key={meal.id}
                label={S.chipLabel(meal.name, meal.calories)}
                onClick={() => logRecentMeal(meal)}
                disabled={busy}
                variant="outlined"
                sx={styles.chip}
              />
            ))}
          </Stack>
        </Box>
      )}
    </SectionCard>
  );
}
