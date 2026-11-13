import { useState } from 'react';
import { Box, Button, Card, Chip, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { AutorenewRounded, CheckCircleRounded, SwapHorizRounded } from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutrition';
import { useLogPlanMeal, useRegeneratePlanMeal } from '../../hooks/queries/useDietPlanQueries';
import { resolveApiError } from '../../lib/apiClient';
import { fastingWarningText, slotLabel } from '../../utils/mealPlan';
import type { PlanItem, PlanMeal } from '../../types/dietPlan';
import { SwapFoodDialog } from './SwapFoodDialog';
import { planMealCardStyles as styles } from './PlanMealCard.styles';

const S = STRINGS.mealPlan;
const F = STRINGS.nutrition.form;

type PlanMealCardProps = {
  meal: PlanMeal;
  logged: boolean;
  /** Another plan change is running; actions wait for it. */
  locked: boolean;
};

type SwapTarget = { item: PlanItem; index: number };

/** One planned meal: its foods and portions, with swap, new option and log actions. */
export function PlanMealCard({ meal, logged, locked }: PlanMealCardProps) {
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);
  const regenerate = useRegeneratePlanMeal();
  const logMeal = useLogPlanMeal();
  const busy = locked || regenerate.isPending || logMeal.isPending;
  const label = slotLabel(meal.id);
  const Icon = MEAL_TYPE_OPTIONS.find((o) => o.value === meal.meal_type)?.icon;

  async function handleRegenerate() {
    try {
      await regenerate.mutateAsync(meal.id);
      toast.success(S.mealUpdated);
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    }
  }

  async function handleLog() {
    try {
      const result = await logMeal.mutateAsync(meal.id);
      toast.success(result.xp_earned > 0 ? `${S.loggedToast} ${F.xpToast(result.xp_earned)}` : S.loggedToast);
      if (result.leveled_up) toast.success(F.levelUpToast(result.new_level));
      if (result.fasting_warning) toast(fastingWarningText(result.fasting_warning));
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    }
  }

  return (
    <Card sx={styles.card}>
      <Stack sx={styles.header}>
        <Stack sx={styles.title}>
          {Icon && <Icon fontSize="small" color="primary" />}
          <Typography variant="subtitle1" component="h3">
            {label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {meal.time}
          </Typography>
          {meal.workout_role && (
            <Chip size="small" variant="outlined" color="primary" label={S.workoutRole[meal.workout_role]} />
          )}
        </Stack>
        <Typography variant="subtitle2" sx={styles.number}>
          {S.kcal(meal.totals.kcal)}
        </Typography>
      </Stack>

      <Box component="ul" sx={styles.items}>
        {meal.items.map((item, index) => (
          <Stack component="li" key={`${item.food_id}-${index}`} sx={styles.item}>
            <Box sx={styles.itemText}>
              <Typography variant="body2" sx={styles.itemName}>
                {item.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {S.amount(item.quantity, item.unit, item.grams)}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={styles.number}>
              {S.kcal(item.nutrients.kcal)}
            </Typography>
            {/* What was eaten today is on record, so a logged meal can't be swapped. */}
            {!logged && (
              <Tooltip title={S.swapAria(item.name)}>
                <span>
                  <IconButton
                    size="small"
                    aria-label={S.swapAria(item.name)}
                    onClick={() => setSwapTarget({ item, index })}
                    disabled={busy}
                  >
                    <SwapHorizRounded fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        ))}
      </Box>

      <Stack sx={styles.footer}>
        <Typography variant="caption" color="text.secondary" sx={styles.number}>
          {S.macros(meal.totals.protein, meal.totals.carbs, meal.totals.fat)}
        </Typography>
        <Stack sx={styles.actions}>
          {logged ? (
            <Typography variant="caption" color="text.secondary">
              {S.lockedUntilTomorrow}
            </Typography>
          ) : (
            <Button
              size="small"
              color="inherit"
              onClick={handleRegenerate}
              disabled={busy}
              aria-label={S.newOptionAria(label)}
              startIcon={regenerate.isPending ? <CircularProgress size={16} color="inherit" /> : <AutorenewRounded />}
            >
              {S.newOption}
            </Button>
          )}
          {logged ? (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            >
              <Stack sx={styles.logged}>
                <CheckCircleRounded fontSize="small" />
                <Typography variant="body2">{S.logged}</Typography>
              </Stack>
            </motion.div>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={handleLog}
              disabled={busy}
              startIcon={logMeal.isPending ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {S.logMeal}
            </Button>
          )}
        </Stack>
      </Stack>

      {swapTarget && (
        <SwapFoodDialog
          mealId={meal.id}
          index={swapTarget.index}
          item={swapTarget.item}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </Card>
  );
}
