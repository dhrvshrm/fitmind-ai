import { Box, Button, Chip, CircularProgress, Skeleton, Typography } from '@mui/material';
import {
  AddRounded,
  CheckCircleRounded,
  CheckRounded,
  MenuBookRounded,
  RestaurantRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { STRINGS } from '../../constants/strings';
import { TODAY_STRINGS } from '../../constants/todayStrings';
import { useCreateDietPlan, useLogPlanMeal } from '../../hooks/queries/useDietPlanQueries';
import { useTodayDietPlan } from '../../hooks/queries/useHabitQueries';
import { useInvalidate } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import { formatClock, nextPlanMeal } from '../../utils/today';
import { TodayCard } from './TodayCard';
import { nextMealCardStyles as styles } from './NextMealCard.styles';

const S = TODAY_STRINGS.meal;
// Other features may add plan slots (e.g. fasting meals); unknown ones fall back to the meal type.
const SLOT_LABELS: Partial<Record<string, string>> = STRINGS.mealPlan.slots;
const VISIBLE_ITEMS = 3;

type NextMealCardProps = {
  /** Onboarding said the plan is still being built: show that and keep checking. */
  planPending: boolean;
};

/** The next meal from the plan, with a one-tap "I ate this". */
export function NextMealCard({ planPending }: NextMealCardProps) {
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const plan = useTodayDietPlan(planPending);
  const logMeal = useLogPlanMeal();
  const createPlan = useCreateDietPlan();
  const { meal, remaining } = nextPlanMeal(plan.data);

  function handleLog() {
    if (!meal) return;
    logMeal.mutate(meal.id, {
      onSuccess: () => {
        toast.success(S.logged);
        void invalidate(QUERY_KEYS.today.all);
      },
      onError: (error) => toast.error(resolveApiError(error, S.logError)),
    });
  }

  function handleCreate() {
    createPlan.mutate(undefined, {
      onError: (error) => toast.error(resolveApiError(error, S.createError)),
    });
  }

  const logOther = (
    <Button variant="outlined" startIcon={<AddRounded />} onClick={() => navigate(ROUTES.NUTRITION)}>
      {S.logOther}
    </Button>
  );

  if (plan.isPending) {
    return (
      <TodayCard title={S.title} icon={RestaurantRounded} highlight>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="rounded" height={64} />
        <Skeleton variant="rounded" height={44} />
      </TodayCard>
    );
  }

  if (!plan.data) {
    if (planPending) {
      return (
        <TodayCard title={S.title} icon={RestaurantRounded} highlight>
          <Box sx={styles.pending} role="status">
            <CircularProgress size={20} />
            <Typography variant="body2">{TODAY_STRINGS.setup.building}</Typography>
          </Box>
        </TodayCard>
      );
    }
    return (
      <TodayCard title={S.title} icon={RestaurantRounded} highlight>
        <Typography variant="h6" component="p" sx={styles.mealName}>
          {S.noPlanTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {S.noPlanBody}
        </Typography>
        <Box sx={styles.actions}>
          <Button
            variant="contained"
            size="large"
            sx={styles.primary}
            onClick={handleCreate}
            disabled={createPlan.isPending}
            startIcon={createPlan.isPending ? <CircularProgress size={18} color="inherit" /> : <MenuBookRounded />}
          >
            {createPlan.isPending ? S.creatingPlan : S.createPlan}
          </Button>
          {logOther}
        </Box>
      </TodayCard>
    );
  }

  if (!meal) {
    return (
      <TodayCard title={S.title} icon={RestaurantRounded} tone="success">
        <Box sx={styles.pending}>
          <CheckCircleRounded color="success" />
          <Typography variant="body1">{S.allDone}</Typography>
        </Box>
        <Typography variant="body2" sx={styles.doneText}>
          {S.allDoneHint}
        </Typography>
        <Box sx={styles.actions}>{logOther}</Box>
      </TodayCard>
    );
  }

  const hidden = meal.items.length - VISIBLE_ITEMS;

  return (
    <TodayCard
      title={S.title}
      icon={RestaurantRounded}
      highlight
      caption={S.at(formatClock(meal.time))}
      action={
        <Button size="small" onClick={() => navigate(ROUTES.MEAL_PLAN)}>
          {S.viewPlan}
        </Button>
      }
    >
      <Typography variant="h5" component="p" sx={styles.mealName}>
        {SLOT_LABELS[meal.id] ?? meal.meal_type}
      </Typography>
      <Box component="ul" sx={styles.items}>
        {meal.items.slice(0, VISIBLE_ITEMS).map((item) => (
          <Box component="li" key={item.food_id} sx={styles.item}>
            <Typography variant="body2" sx={styles.itemName}>
              {item.name}
            </Typography>
            <Typography variant="body2" sx={styles.itemAmount}>
              {item.quantity} {item.unit}
            </Typography>
          </Box>
        ))}
        {hidden > 0 && (
          <Typography component="li" variant="caption" color="text.secondary">
            {S.more(hidden)}
          </Typography>
        )}
      </Box>
      <Box sx={styles.chips}>
        <Chip size="small" label={S.kcal(meal.totals.kcal)} />
        <Chip size="small" color="secondary" variant="outlined" label={S.protein(meal.totals.protein)} />
        {remaining > 1 && <Chip size="small" variant="outlined" label={S.later(remaining - 1)} />}
      </Box>
      <Box sx={styles.actions}>
        <Button
          variant="contained"
          size="large"
          sx={styles.primary}
          onClick={handleLog}
          disabled={logMeal.isPending}
          startIcon={logMeal.isPending ? <CircularProgress size={18} color="inherit" /> : <CheckRounded />}
        >
          {logMeal.isPending ? S.logging : S.log}
        </Button>
        {logOther}
      </Box>
    </TodayCard>
  );
}
