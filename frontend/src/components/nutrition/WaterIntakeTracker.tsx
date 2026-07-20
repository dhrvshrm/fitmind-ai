import { useState } from 'react';
import { IconButton, Paper, Stack, Typography } from '@mui/material';
import {
  AddCircleRounded,
  LocalDrinkRounded,
  RemoveCircleRounded,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { nutritionService } from '../../services/nutritionService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import { GLASS_ML, WATER_GOAL_GLASSES } from '../../constants/nutrition';
import { waterIntakeTrackerStyles as styles } from './WaterIntakeTracker.styles';

const S = STRINGS.nutrition.water;

type WaterIntakeTrackerProps = {
  /** Today's total from the summary. */
  waterMl: number;
  /** Reports the fresh server total after each change. */
  onChange: (waterMl: number) => void;
};

/** Glass counter synced with the backend; each glass is 250 ml. */
export function WaterIntakeTracker({ waterMl, onChange }: WaterIntakeTrackerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const glasses = Math.floor(waterMl / GLASS_ML);
  const goalReached = glasses >= WATER_GOAL_GLASSES;

  async function adjust(deltaGlasses: 1 | -1) {
    setIsUpdating(true);
    try {
      const total = await nutritionService.logWater(deltaGlasses * GLASS_ML);
      onChange(total);
    } catch (error) {
      toast.error(resolveApiError(error, S.error));
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      <Stack sx={styles.glassesRow}>
        {Array.from({ length: WATER_GOAL_GLASSES }, (_, index) => (
          <LocalDrinkRounded key={index} sx={styles.glassIcon(index < glasses)} />
        ))}
      </Stack>

      <Stack sx={styles.controlsRow}>
        <IconButton
          aria-label={S.removeAria}
          onClick={() => adjust(-1)}
          disabled={isUpdating || glasses <= 0}
          color="info"
        >
          <RemoveCircleRounded fontSize="large" />
        </IconButton>
        <Typography variant="h4" sx={styles.count}>
          {glasses}
        </Typography>
        <IconButton
          aria-label={S.addAria}
          onClick={() => adjust(1)}
          disabled={isUpdating}
          color="info"
        >
          <AddCircleRounded fontSize="large" />
        </IconButton>
      </Stack>

      {goalReached ? (
        <Typography variant="body2" sx={styles.goalReached}>
          {S.goalReached}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={styles.goalText}>
          {S.goal(glasses, WATER_GOAL_GLASSES, waterMl)}
        </Typography>
      )}
    </Paper>
  );
}
