import { Box } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { DietPlan } from '../../types/dietPlan';
import { SectionCard } from '../ui/SectionCard';
import { ProgressRow } from '../ui/ProgressRow';
import { planSummaryStyles as styles } from './PlanSummary.styles';

const S = STRINGS.mealPlan;

type PlanSummaryProps = {
  plan: DietPlan;
};

/** How the planned day adds up against the targets it was made for. */
export function PlanSummary({ plan }: PlanSummaryProps) {
  const chart = useChartTheme();
  const { totals, targets } = plan;
  const rows = [
    { label: S.labels.calories, value: totals.kcal, goal: targets.calories, unit: S.units.kcal },
    { label: S.labels.protein, value: totals.protein, goal: targets.protein, unit: S.units.grams, color: chart.protein },
    { label: S.labels.carbs, value: totals.carbs, goal: targets.carbs, unit: S.units.grams, color: chart.carbs },
    { label: S.labels.fat, value: totals.fat, goal: targets.fats, unit: S.units.grams, color: chart.fats },
    { label: S.labels.fiber, value: totals.fiber, goal: targets.fiber, unit: S.units.grams },
  ];

  return (
    <SectionCard title={S.summaryTitle} subtitle={S.summarySubtitle}>
      <Box sx={styles.rows}>
        {rows.map((row) => (
          <ProgressRow key={row.label} {...row} />
        ))}
      </Box>
    </SectionCard>
  );
}
