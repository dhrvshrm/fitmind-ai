import { Box, Card, LinearProgress, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import type { PlanDay } from '../../types/dietPlan';
import { todaySoFarStyles as styles } from './TodaySoFar.styles';

const T = STRINGS.mealPlan.today;

type TodaySoFarProps = {
  day: PlanDay;
};

/** What's been eaten today against the targets, and how the rest of the plan shifts. */
export function TodaySoFar({ day }: TodaySoFarProps) {
  if (day.state === 'not_started') return null;
  const percent = day.target_kcal > 0 ? Math.min(100, (day.eaten_kcal / day.target_kcal) * 100) : 0;
  const message = T.state[day.state];

  return (
    <Card sx={styles.card}>
      <Stack sx={styles.header}>
        <Typography variant="subtitle1" component="h2" sx={styles.title}>
          {T.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {T.mealsLeft(day.meals_left)}
        </Typography>
      </Stack>
      <Stack sx={styles.numbers}>
        <Typography variant="body2" sx={styles.number}>
          {T.eaten(day.eaten_kcal, day.target_kcal)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={styles.number}>
          {T.protein(day.eaten_protein, day.target_protein)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={day.state === 'over' ? 'secondary' : 'primary'}
        sx={styles.bar}
        aria-label={T.eaten(day.eaten_kcal, day.target_kcal)}
      />
      {message && (
        <Typography variant="body2" sx={styles.message}>
          {message}
        </Typography>
      )}
      {day.protein_gap > 0 && (
        <Typography variant="body2" color="text.secondary">
          {T.proteinGap(day.protein_gap)}
        </Typography>
      )}
      {day.extras.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            {T.extras(day.extras.map((e) => T.extra(e.name, e.calories)).join(', '))}
          </Typography>
        </Box>
      )}
    </Card>
  );
}
