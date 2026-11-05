import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { MacroTotals } from '../../types/nutrition';
import type { Targets } from '../../types/onboarding';
import { TargetsSummary } from './TargetsSummary';
import { SectionCard } from '../ui/SectionCard';
import { ProgressRow } from '../ui/ProgressRow';
import { calorieProgressBarStyles as styles } from './CalorieProgressBar.styles';

const S = STRINGS.nutrition.calories;
const M = STRINGS.nutrition.macros.labels;

type CalorieProgressBarProps = {
  totals: MacroTotals;
  goals: MacroTotals;
  remaining: number;
  /** Personal targets with their reasoning; null for profiles without the basics yet. */
  targets: Targets | null;
};

const T = STRINGS.targets;

/** Today's calories against target, with protein, carbs and fats underneath. */
export function CalorieProgressBar({ totals, goals, remaining, targets }: CalorieProgressBarProps) {
  const [showHow, setShowHow] = useState(false);
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
      {targets && (
        <Button size="small" startIcon={<InfoOutlined />} onClick={() => setShowHow(true)} sx={styles.howButton}>
          {T.howButton}
        </Button>
      )}

      {targets && (
        <Dialog open={showHow} onClose={() => setShowHow(false)} fullWidth maxWidth="sm">
          <DialogTitle>{T.howTitle}</DialogTitle>
          <DialogContent>
            <TargetsSummary targets={targets} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowHow(false)}>{T.close}</Button>
          </DialogActions>
        </Dialog>
      )}
    </SectionCard>
  );
}
