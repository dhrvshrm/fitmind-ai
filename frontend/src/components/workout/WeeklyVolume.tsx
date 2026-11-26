import { Box, LinearProgress, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import type { MuscleGroup } from '../../types/exercise';
import { weeklyVolumeStyles as styles } from './WeeklyVolume.styles';

const S = STRINGS.workout.volume;

/** Muscles that get trained directly; helpers like forearms or lower back aren't tallied. */
const MAIN_MUSCLES: MuscleGroup[] = [
  'chest', 'lats', 'middle back', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abdominals',
];
const M = STRINGS.exercises.muscles;

type WeeklyVolumeProps = {
  sets: Record<string, number>;
  target: [number, number];
};

/** Hard sets per muscle this week against the range that builds muscle at this level. */
export function WeeklyVolume({ sets, target }: WeeklyVolumeProps) {
  const [low, high] = target;
  const rows = Object.entries(sets)
    .filter(([muscle, count]) => count >= 1 && MAIN_MUSCLES.includes(muscle as MuscleGroup))
    .sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return null;

  return (
    <Box sx={styles.root}>
      <Typography variant="subtitle2" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {S.subtitle(low, high)}
      </Typography>
      <Box sx={styles.grid}>
        {rows.map(([muscle, count]) => {
          const status = count < low ? S.under : count > high ? S.over : S.inRange;
          const color = count < low ? 'warning' : count > high ? 'info' : 'success';
          return (
            <Box key={muscle} sx={styles.row}>
              <Box sx={styles.rowHead}>
                <Typography variant="body2">{M[muscle as MuscleGroup] ?? muscle}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {S.sets(count)}, {status}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                color={color}
                value={Math.min(100, (count / high) * 100)}
                sx={styles.bar}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
