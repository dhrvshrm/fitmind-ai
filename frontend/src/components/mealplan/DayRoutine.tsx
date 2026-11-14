import type { ComponentType, ReactNode } from 'react';
import { Box, Button, Stack, Typography, type SvgIconProps } from '@mui/material';
import {
  BakeryDiningRounded,
  BedtimeRounded,
  DarkModeRounded,
  FitnessCenterRounded,
  NightsStayRounded,
  RestaurantRounded,
  TuneRounded,
  WbSunnyRounded,
} from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { INDIA_FIRST_STRINGS } from '../../constants/indiaFirstStrings';
import type { DietPlan, EatenLog, PlanMeal, RoutineEvent, RoutineKind } from '../../types/dietPlan';
import { Reveal } from '../ui/Reveal';
import { dayRoutineStyles as styles } from './DayRoutine.styles';

const R = STRINGS.mealPlan.routine;
const I = INDIA_FIRST_STRINGS;

const ICONS: Record<RoutineKind, ComponentType<SvgIconProps>> = {
  wake: WbSunnyRounded,
  workout: FitnessCenterRounded,
  meal: RestaurantRounded,
  wind_down: NightsStayRounded,
  sleep: BedtimeRounded,
  fast_begins: DarkModeRounded,
  extra: BakeryDiningRounded,
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
    case 'fast_begins':
      return { title: I.routine.fastBegins.title, detail: I.routine.fastBegins.detail };
    case 'extra':
      return {
        title: R.extra.title(event.log?.name ?? ''),
        detail: R.extra.detail(event.log?.calories ?? 0, event.log?.protein ?? 0),
      };
    default:
      return { title: R.mealFallback, detail: '' };
  }
}

type DayRoutineProps = {
  plan: DietPlan;
  /** Opens the wake, sleep and shift times editor. */
  onEditTimes: () => void;
  /** Shown under the subtitle, e.g. that times follow a night shift. */
  note?: string;
  /** Renders the full card for a meal, placed at its time in the day. */
  renderMeal: (meal: PlanMeal) => ReactNode;
};

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Off-plan foods eaten today (no plan meal covers them), slotted into the day
 * by time. Times count from the first event, so a night shift's day that runs
 * past midnight still sorts in order.
 */
function withExtras(events: RoutineEvent[], extras: EatenLog[]): RoutineEvent[] {
  if (!extras.length || !events.length) return events;
  const start = minutes(events[0].time);
  const since = (t: string) => (minutes(t) - start + 24 * 60) % (24 * 60);
  const result = [...events];
  for (const log of extras) {
    const time = log.time ?? log.eaten_at;
    if (!time) continue;
    const at = result.findIndex((e) => since(e.time) > since(time));
    const event: RoutineEvent = { time, kind: 'extra', values: {}, log };
    if (at === -1) result.push(event);
    else result.splice(at, 0, event);
  }
  return result;
}

/**
 * The whole day in order, from waking to sleep: water, workout, each meal as
 * its full card, wind-down and bedtime. One column, so nothing is repeated.
 */
export function DayRoutine({ plan, renderMeal, onEditTimes, note }: DayRoutineProps) {
  // Plans saved before the routine existed still list their meals in order.
  const base: RoutineEvent[] = plan.routine?.length
    ? plan.routine
    : plan.meals.map((m) => ({ time: m.time, kind: 'meal', meal_id: m.id, values: {} }));
  const events = withExtras(base, plan.today?.day.extras ?? []);

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
          {note && (
            <Typography variant="caption" color="primary" component="p" sx={styles.note}>
              {note}
            </Typography>
          )}
        </Box>
        <Button size="small" color="inherit" startIcon={<TuneRounded />} onClick={onEditTimes}>
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
            <Box component="li" key={`${event.kind}-${event.time}-${event.meal_id ?? event.log?.id ?? ''}`} sx={styles.item}>
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
