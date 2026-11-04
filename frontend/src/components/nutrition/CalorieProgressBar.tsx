import { LinearProgress, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { MacroTotals } from '../../types/nutrition';
import { SectionCard } from '../ui/SectionCard';
import { ProgressRow } from '../ui/ProgressRow';
import { calorieProgressBarStyles as styles } from './CalorieProgressBar.styles';

const S = STRINGS.nutrition.calories;
const M = STRINGS.nutrition.macros.labels;

type CalorieProgressBarProps = {
  totals: MacroTotals;
  goals: MacroTotals;
  remaining: number;
};

/** Today's calories against target, with protein, carbs and fats underneath. */
export function CalorieProgressBar({ totals, goals, remaining }: CalorieProgressBarProps) {
  const chart = useChartTheme();
  const percent = goals.calories > 0 ? Math.min(100, (totals.calories / goals.calories) * 100) : 0;
  const over = remaining < 0;

  return (
    <SectionCard
      title={S.title}
      action={
        <Typography variant="body2" sx={styles.progressText}>
          {S.progress(Math.round(totals.calories), Math.round(goals.calories))}
        </Typography>
      }
    >
      <LinearProgress
        variant="determinate"
        value={percent}
        color={over ? 'error' : 'primary'}
        sx={styles.bar}
      />
      <Typography variant="caption" color={over ? 'error' : 'text.secondary'} sx={styles.remaining}>
        {over ? S.over(Math.round(-remaining)) : S.remaining(Math.round(remaining))}
      </Typography>

      <Stack sx={styles.macros}>
        <ProgressRow label={M.protein} value={totals.protein} goal={goals.protein} unit={S.grams} color={chart.protein} />
        <ProgressRow label={M.carbs} value={totals.carbs} goal={goals.carbs} unit={S.grams} color={chart.carbs} />
        <ProgressRow label={M.fats} value={totals.fats} goal={goals.fats} unit={S.grams} color={chart.fats} />
      </Stack>
    </SectionCard>
  );
}
