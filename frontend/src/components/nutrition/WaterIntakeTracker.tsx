import { IconButton, Stack, Typography } from '@mui/material';
import { AddRounded, LocalDrinkRounded, RemoveRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useLogWater } from '../../hooks/queries/useNutritionQueries';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { GLASS_ML, WATER_GOAL_GLASSES } from '../../constants/nutrition';
import { SectionCard } from '../ui/SectionCard';
import { waterIntakeTrackerStyles as styles } from './WaterIntakeTracker.styles';

const S = STRINGS.nutrition.water;

type WaterIntakeTrackerProps = {
  /** Today's total from the summary. */
  waterMl: number;
  /** Personal daily target in ml; falls back to 8 glasses when unknown. */
  goalMl: number | null;
};

/** Glass counter synced with the backend; each glass is 250 ml. */
export function WaterIntakeTracker({ waterMl, goalMl }: WaterIntakeTrackerProps) {
  const goalGlasses = goalMl ? Math.max(1, Math.round(goalMl / GLASS_ML)) : WATER_GOAL_GLASSES;
  const logWater = useLogWater();
  const glasses = Math.floor(waterMl / GLASS_ML);
  const goalReached = glasses >= goalGlasses;

  function adjust(deltaGlasses: 1 | -1) {
    logWater.mutate(deltaGlasses * GLASS_ML, {
      onError: (error) => toast.error(resolveApiError(error, S.error)),
    });
  }

  return (
    <SectionCard title={S.title}>
      <Stack sx={styles.glassesRow}>
        {Array.from({ length: goalGlasses }, (_, index) => (
          <LocalDrinkRounded key={index} sx={styles.glassIcon(index < glasses)} />
        ))}
      </Stack>

      <Stack sx={styles.controlsRow}>
        <IconButton
          aria-label={S.removeAria}
          onClick={() => adjust(-1)}
          disabled={logWater.isPending || glasses <= 0}
          sx={styles.stepButton}
        >
          <RemoveRounded />
        </IconButton>
        <Typography variant="h4" component="p" sx={styles.count}>
          {glasses}
        </Typography>
        <IconButton
          aria-label={S.addAria}
          onClick={() => adjust(1)}
          disabled={logWater.isPending}
          sx={styles.stepButton}
        >
          <AddRounded />
        </IconButton>
      </Stack>

      <Typography
        variant="caption"
        color={goalReached ? 'success.main' : 'text.secondary'}
        sx={styles.goalText}
      >
        {goalReached ? S.goalReached : S.goal(glasses, goalGlasses, waterMl)}
      </Typography>
    </SectionCard>
  );
}
