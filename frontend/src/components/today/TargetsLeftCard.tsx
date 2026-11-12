import { Box, CircularProgress, Skeleton, Typography } from '@mui/material';
import { DonutLargeRounded } from '@mui/icons-material';
import { TODAY_STRINGS } from '../../constants/todayStrings';
import type { NutritionSummary } from '../../types/nutrition';
import { leftOf, percentOf } from '../../utils/today';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { TodayCard } from './TodayCard';
import {
  RING_SIZE,
  RING_THICKNESS,
  targetsLeftCardStyles as styles,
} from './TargetsLeftCard.styles';

const S = TODAY_STRINGS.left;
const UNITS = S.units;

type RingProps = {
  label: string;
  eaten: number;
  goal: number;
  unit: string;
  color: 'primary' | 'secondary';
};

function Ring({ label, eaten, goal, unit, color }: RingProps) {
  const left = leftOf(goal, eaten);
  // The ring already shows what's left; a status line only when the target is met or passed.
  const status = left > 0 ? null : left === 0 ? S.done : S.over(-left, unit);
  return (
    <Box sx={styles.ringBlock}>
      <Box sx={styles.ringWrap}>
        <CircularProgress variant="determinate" value={100} size={RING_SIZE} thickness={RING_THICKNESS} sx={styles.track} />
        <CircularProgress
          variant="determinate"
          value={percentOf(eaten, goal)}
          size={RING_SIZE}
          thickness={RING_THICKNESS}
          color={color}
          sx={styles.ring}
          aria-label={label}
        />
        <Box sx={styles.ringCenter}>
          <Typography variant="h6" component="p" sx={styles.ringValue}>
            <AnimatedNumber value={Math.max(left, 0)} />
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {S.unitLeft(unit)}
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" sx={styles.label}>
        {label}
      </Typography>
      {status && (
        <Typography variant="caption" sx={styles.sub}>
          {status}
        </Typography>
      )}
      <Typography variant="caption" sx={styles.sub}>
        {S.eaten(eaten, goal, unit)}
      </Typography>
    </Box>
  );
}

type TargetsLeftCardProps = {
  summary: NutritionSummary | undefined;
  loading: boolean;
};

/** Calories and protein still to go today. */
export function TargetsLeftCard({ summary, loading }: TargetsLeftCardProps) {
  if (loading) {
    return (
      <TodayCard title={S.title} icon={DonutLargeRounded}>
        <Box sx={styles.rings}>
          <Skeleton variant="circular" width={RING_SIZE} height={RING_SIZE} />
          <Skeleton variant="circular" width={RING_SIZE} height={RING_SIZE} />
        </Box>
      </TodayCard>
    );
  }

  if (!summary?.targets) {
    return (
      <TodayCard title={S.title} icon={DonutLargeRounded}>
        <Typography variant="body2" color="text.secondary">
          {S.noTargets}
        </Typography>
      </TodayCard>
    );
  }

  return (
    <TodayCard title={S.title} icon={DonutLargeRounded}>
      <Box sx={styles.rings}>
        <Ring
          label={S.calories}
          eaten={summary.totals.calories}
          goal={summary.goals.calories}
          unit={UNITS.kcal}
          color="primary"
        />
        <Ring
          label={S.protein}
          eaten={summary.totals.protein}
          goal={summary.goals.protein}
          unit={UNITS.grams}
          color="secondary"
        />
      </Box>
    </TodayCard>
  );
}
