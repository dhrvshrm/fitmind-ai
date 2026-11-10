import type { ComponentType, ReactNode } from 'react';
import { Box, Button, Stack, Typography, type SvgIconProps } from '@mui/material';
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
import type { DietPlan, PlanMeal, RoutineEvent, RoutineKind } from '../../types/dietPlan';
import { Reveal } from '../ui/Reveal';
import { dayRoutineStyles as styles } from './DayRoutine.styles';

const R = STRINGS.mealPlan.routine;

const ICONS: Record<RoutineKind, ComponentType<SvgIconProps>> = {
  wake: WbSunnyRounded,
  workout: FitnessCenterRounded,
  meal: RestaurantRounded,
  wind_down: NightsStayRounded,
  sleep: BedtimeRounded,
};

function stepText(event: RoutineEvent): { title: string; detail: string } {
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
    default:
      return { title: R.mealFallback, detail: '' };
  }
}

type DayRoutineProps = {
  plan: DietPlan;
  /** Renders the full card for a meal, placed at its time in the day. */
  renderMeal: (meal: PlanMeal) => ReactNode;
};

/**
 * The whole day in order, from waking to sleep: water, workout, each meal as
 * its full card, wind-down and bedtime. One column, so nothing is repeated.
 */
export function DayRoutine({ plan, renderMeal }: DayRoutineProps) {
  const navigate = useNavigate();
  // Plans saved before the routine existed still list their meals in order.
  const events: RoutineEvent[] = plan.routine?.length
    ? plan.routine
    : plan.meals.map((m) => ({ time: m.time, kind: 'meal', meal_id: m.id, values: {} }));

  return (
    <Box component="section">
      <Stack sx={styles.header}>
        <Box>
          <Typography variant="h6" component="h2">
            {R.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {R.subtitle}
          </Typography>
        </Box>
        <Button size="small" color="inherit" startIcon={<TuneRounded />} onClick={() => navigate(`${ROUTES.ONBOARDING}?mode=update`)}>
          {R.edit}
        </Button>
      </Stack>

      <Box component="ol" sx={styles.list}>
        {events.map((event, index) => {
          const meal = event.kind === 'meal' ? plan.meals.find((m) => m.id === event.meal_id) : undefined;
          if (event.kind === 'meal' && !meal) return null;
          const Icon = ICONS[event.kind];
          const last = index === events.length - 1;
          const text = meal ? null : stepText(event);
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
              <Box sx={styles.content(last, Boolean(meal))}>
                <Reveal index={index}>
                  {meal ? (
                    renderMeal(meal)
                  ) : (
                    <Box sx={styles.step}>
                      <Typography variant="subtitle2">
                        <Box component="span" sx={styles.inlineTime}>
                          {event.time}
                        </Box>
                        {text?.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {text?.detail}
                      </Typography>
                    </Box>
                  )}
                </Reveal>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
