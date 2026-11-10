import type { ComponentType } from 'react';
import { Box, Button, Chip, Stack, Typography, type SvgIconProps } from '@mui/material';
import {
  BedtimeRounded,
  FitnessCenterRounded,
  NightsStayRounded,
  RestaurantRounded,
  TuneRounded,
  WbSunnyRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { STRINGS } from '../../constants/strings';
import { ROUTES } from '../../constants/routes';
import type { DietPlan, RoutineEvent, RoutineKind } from '../../types/dietPlan';
import { SectionCard } from '../ui/SectionCard';
import { dayRoutineStyles as styles } from './DayRoutine.styles';

const S = STRINGS.mealPlan;
const R = S.routine;

const ICONS: Record<RoutineKind, ComponentType<SvgIconProps>> = {
  wake: WbSunnyRounded,
  workout: FitnessCenterRounded,
  meal: RestaurantRounded,
  wind_down: NightsStayRounded,
  sleep: BedtimeRounded,
};

function describe(event: RoutineEvent, plan: DietPlan): { title: string; detail: string; role?: string } {
  const v = event.values;
  switch (event.kind) {
    case 'wake':
      return { title: R.wake.title, detail: R.wake.detail(v.ml ?? 0, v.liters ?? 0) };
    case 'workout':
      return { title: R.workout.title, detail: R.workout.detail(v.minutes ?? 0) };
    case 'wind_down':
      return { title: R.windDown.title, detail: R.windDown.detail };
    case 'sleep':
      return { title: R.sleep.title, detail: R.sleep.detail(v.hours ?? 0) };
    case 'meal': {
      const meal = plan.meals.find((m) => m.id === event.meal_id);
      const title = meal ? S.slots[meal.id] : R.mealFallback;
      const items = meal ? meal.items.map((i) => i.name).join(', ') : '';
      return {
        title,
        detail: R.meal.detail(v.kcal ?? 0, items),
        role: meal?.workout_role ? S.workoutRole[meal.workout_role] : undefined,
      };
    }
  }
}

/** The day from waking to sleep: water, workout, each meal, wind-down and bedtime. */
export function DayRoutine({ plan }: { plan: DietPlan }) {
  const navigate = useNavigate();
  if (!plan.routine?.length) return null;

  return (
    <SectionCard
      title={R.title}
      subtitle={R.subtitle}
      action={
        <Button size="small" color="inherit" startIcon={<TuneRounded />} onClick={() => navigate(`${ROUTES.ONBOARDING}?mode=update`)}>
          {R.edit}
        </Button>
      }
    >
      <Box component="ol" sx={styles.list}>
        {plan.routine.map((event, index) => {
          const Icon = ICONS[event.kind];
          const { title, detail, role } = describe(event, plan);
          const last = index === plan.routine.length - 1;
          return (
            <Box component="li" key={`${event.kind}-${event.time}-${event.meal_id ?? ''}`} sx={styles.item}>
              <Typography variant="body2" sx={styles.time}>
                {event.time}
              </Typography>
              <Box sx={styles.rail}>
                <Box sx={styles.dot(event.kind)}>
                  <Icon sx={styles.icon} />
                </Box>
                {!last && <Box sx={styles.line} />}
              </Box>
              <Box sx={styles.content(last)}>
                <Stack sx={styles.titleRow}>
                  <Typography variant="subtitle2">{title}</Typography>
                  {role && <Chip size="small" variant="outlined" color="primary" label={role} />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {detail}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
}
