import { Box, Stack, Typography } from '@mui/material';
import { PieChartRounded } from '@mui/icons-material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { STRINGS } from '../../constants/strings';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { MacroPercentages, MacroTotals } from '../../types/nutrition';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { macroPieChartStyles as styles } from './MacroPieChart.styles';

const S = STRINGS.nutrition.macros;
const MACROS = ['protein', 'carbs', 'fats'] as const;

type MacroPieChartProps = {
  percentages: MacroPercentages;
  totals: MacroTotals;
};

/**
 * Donut of today's macro split. Slices carry a 2px surface gap; the legend
 * always spells out percent and grams, which is the required relief for the
 * lower-contrast slices and keeps identity from relying on color alone.
 */
export function MacroPieChart({ percentages, totals }: MacroPieChartProps) {
  const chart = useChartTheme();
  const data = MACROS.map((macro) => ({
    key: macro,
    name: S.labels[macro],
    value: percentages[macro],
    grams: totals[macro],
    color: chart[macro],
  })).filter((entry) => entry.value > 0);

  return (
    <SectionCard title={S.title}>
      {data.length === 0 ? (
        <EmptyState icon={PieChartRounded} title={S.emptyTitle} description={S.empty} compact />
      ) : (
        <>
          <Box sx={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  stroke={chart.surface}
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelStyle={chart.tooltipLabel}
                  itemStyle={chart.tooltipItem}
                  formatter={(value, name, entry) => {
                    const grams = (entry?.payload as { grams?: number })?.grams ?? 0;
                    return [S.tooltipValue(value as number, grams), name as string];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box sx={styles.legend}>
            {data.map((entry) => (
              <Stack key={entry.key} sx={styles.legendRow}>
                <Box component="span" sx={styles.legendDot(entry.color)} />
                <Typography variant="body2" sx={styles.legendLabel}>
                  {entry.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={styles.legendValue}>
                  {S.legendValue(entry.value, entry.grams)}
                </Typography>
              </Stack>
            ))}
          </Box>
        </>
      )}
    </SectionCard>
  );
}
