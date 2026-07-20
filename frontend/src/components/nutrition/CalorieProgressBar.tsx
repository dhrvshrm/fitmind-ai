import { LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { calorieProgressBarStyles as styles } from './CalorieProgressBar.styles';

const S = STRINGS.nutrition.calories;

type CalorieProgressBarProps = {
  eaten: number;
  goal: number;
  remaining: number;
};

/** Daily calorie progress: green while under goal, red once over. */
export function CalorieProgressBar({ eaten, goal, remaining }: CalorieProgressBarProps) {
  const percent = goal > 0 ? Math.min(100, (eaten / goal) * 100) : 0;
  const over = remaining < 0;

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Stack sx={styles.headerRow}>
        <Typography variant="h6" sx={styles.title}>
          {S.title}
        </Typography>
        <Typography variant="body2" sx={styles.progressText}>
          {S.progress(Math.round(eaten), Math.round(goal))}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={percent}
        color={over ? 'error' : 'success'}
        sx={styles.bar}
      />

      <Typography
        variant="caption"
        color={over ? 'error' : 'text.secondary'}
        sx={styles.remaining}
      >
        {over ? S.over(Math.round(-remaining)) : S.remaining(Math.round(remaining))}
      </Typography>
    </Paper>
  );
}
