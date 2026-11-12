import { Box, Button, LinearProgress, Typography } from '@mui/material';
import { AddRounded, WaterDropRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { STRINGS } from '../../constants/strings';
import { TODAY_STRINGS } from '../../constants/todayStrings';
import { GLASS_ML, WATER_GOAL_GLASSES } from '../../constants/nutrition';
import { useLogWater } from '../../hooks/queries/useNutritionQueries';
import { useInvalidate } from '../../hooks/queries/queryHelpers';
import { resolveApiError } from '../../lib/apiClient';
import { percentOf } from '../../utils/today';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { TodayCard } from './TodayCard';
import { waterCardStyles as styles } from './WaterCard.styles';

const S = TODAY_STRINGS.water;
const AMOUNTS = [GLASS_ML, GLASS_ML * 2] as const;

type WaterCardProps = {
  waterMl: number;
  /** Personal target; falls back to the default number of glasses. */
  goalMl: number | null;
};

/** Today's water with one-tap glasses. */
export function WaterCard({ waterMl, goalMl }: WaterCardProps) {
  const logWater = useLogWater();
  const invalidate = useInvalidate();
  const goal = goalMl ?? WATER_GOAL_GLASSES * GLASS_ML;
  const reached = waterMl >= goal;

  function add(amount: number) {
    logWater.mutate(amount, {
      onSuccess: () => void invalidate(QUERY_KEYS.today.all),
      onError: (error) => toast.error(resolveApiError(error, S.error)),
    });
  }

  return (
    <TodayCard title={S.title} icon={WaterDropRounded} tone="info">
      <Box sx={styles.amount}>
        <Typography variant="h4" component="p" sx={styles.value}>
          <AnimatedNumber value={waterMl} /> {S.unit}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {S.of(STRINGS.targets.values.liters(goal))}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={percentOf(waterMl, goal)} sx={styles.bar} />
      {reached && (
        <Typography variant="body2" sx={styles.done}>
          {S.done}
        </Typography>
      )}
      <Box sx={styles.buttons}>
        {AMOUNTS.map((amount) => (
          <Button
            key={amount}
            variant="outlined"
            color="info"
            startIcon={<AddRounded />}
            aria-label={S.addAria(amount)}
            disabled={logWater.isPending}
            onClick={() => add(amount)}
          >
            {S.add(amount)}
          </Button>
        ))}
      </Box>
    </TodayCard>
  );
}
