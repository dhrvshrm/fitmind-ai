import { useState } from 'react';
import { Box, Button, Card, Chip, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import {
  AutorenewRounded,
  CheckCircleRounded,
  OpacityRounded,
  RestaurantRounded,
  SwapHorizRounded,
  TuneRounded,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { STRINGS } from '../../constants/strings';
import { MEAL_TYPE_OPTIONS } from '../../constants/nutrition';
import { useLogPlanMeal, useRegeneratePlanMeal } from '../../hooks/queries/useDietPlanQueries';
import { resolveApiError } from '../../lib/apiClient';
import { cookingFatText, fastingWarningText, slotLabel } from '../../utils/mealPlan';
import type { PlanItem, PlanMeal, PlanMealToday } from '../../types/dietPlan';
import { SwapFoodDialog } from './SwapFoodDialog';
import { planMealCardStyles as styles } from './PlanMealCard.styles';

const S = STRINGS.mealPlan;
const F = STRINGS.nutrition.form;

type PlanMealCardProps = {
  meal: PlanMeal;
  logged: boolean;
  /** Another plan change is running; actions wait for it. */
  locked: boolean;
  /** What today's food log says about this meal. */
  today?: PlanMealToday;
};

type SwapTarget = { item: PlanItem; index: number };

/** One planned meal: its foods and portions, with swap, new option and log actions. */
export function PlanMealCard({ meal, logged, locked, today }: PlanMealCardProps) {
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);
  const regenerate = useRegeneratePlanMeal();
  const logMeal = useLogPlanMeal();
  const busy = locked || regenerate.isPending || logMeal.isPending;
  const label = slotLabel(meal.id);
  const Icon = MEAL_TYPE_OPTIONS.find((o) => o.value === meal.meal_type)?.icon;
  // Logged by hand from the food diary (not from this card): what was eaten replaces the plan.
  const eatenByHand = !logged && today?.status === 'eaten';
  const done = logged || eatenByHand;
  const adjust = done ? null : today?.adjust;
  // The costliest fat in the meal, for "each extra teaspoon adds about ...".
  const fatKcalPerTsp = Math.max(0, ...meal.items.flatMap((i) => (i.cooking_fat ?? []).map((f) => f.kcal_per_tsp)));

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
          {S.kcal(eatenByHand ? (today?.eaten_totals?.calories ?? 0) : meal.totals.kcal)}
        </Typography>
      </Stack>

      {adjust && (
        <Tooltip title={S.adjust.tip(adjust.portion_percent)}>
          <Chip
            size="small"
            color="secondary"
            variant="outlined"
            icon={<TuneRounded />}
            label={S.adjust.chip(adjust.portion_percent, adjust.kcal_delta)}
            sx={styles.adjust}
          />
        </Tooltip>
      )}

      {eatenByHand && (
        <Box sx={styles.eaten}>
          <Typography variant="overline" sx={styles.eatenTitle}>
            {S.eaten.title}
          </Typography>
          <Box component="ul" sx={styles.eatenList}>
            {today?.eaten.map((log) => (
              <Stack component="li" key={log.id} sx={styles.eatenItem}>
                <RestaurantRounded fontSize="small" sx={styles.eatenIcon} />
                <Typography variant="body2" sx={styles.itemText}>
                  {log.name}
                  {log.eaten_at && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {' '}
                      {S.eaten.at(log.eaten_at)}
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={styles.number}>
                  {S.kcal(log.calories)}
                </Typography>
              </Stack>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={styles.plannedLabel}>
            {S.eaten.planned}
          </Typography>
        </Box>
      )}

      <Box component="ul" sx={eatenByHand ? styles.itemsMuted : styles.items}>
        {meal.items.map((item, index) => (
          <Stack component="li" key={`${item.food_id}-${index}`} sx={styles.item}>
            <Box sx={styles.itemText}>
              <Typography variant="body2" sx={styles.itemName}>
                {item.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {S.amount(item.quantity, item.unit, item.grams)}
                {item.cooking_fat && item.cooking_fat.length > 0 && (
                  <Box component="span" sx={styles.fat}>
                    {' · '}
                    {cookingFatText(item.cooking_fat)}
                  </Box>
                )}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={styles.number}>
              {S.kcal(item.nutrients.kcal)}
            </Typography>
            {/* What was eaten today is on record, so a logged meal can't be swapped. */}
            {!done && (
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
        {!eatenByHand && meal.cooking_fat && meal.cooking_fat.length > 0 && (
          <Tooltip title={S.cookingFat.tip(fatKcalPerTsp)}>
            <Stack sx={styles.fatLine} tabIndex={0}>
              <OpacityRounded fontSize="small" />
              <Typography variant="caption">{S.cookingFat.meal(cookingFatText(meal.cooking_fat))}</Typography>
            </Stack>
          </Tooltip>
        )}
        <Stack sx={styles.actions}>
          {done ? (
            <Typography variant="caption" color="text.secondary">
              {eatenByHand ? S.eaten.hint : S.lockedUntilTomorrow}
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
          {done ? (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            >
              <Stack sx={styles.logged}>
                <CheckCircleRounded fontSize="small" />
                <Typography variant="body2">{eatenByHand ? S.eaten.badge : S.logged}</Typography>
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
