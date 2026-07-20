import { Box, Paper, Stack, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { STRINGS } from '../../constants/strings';
import { MACRO_COLORS } from '../../constants/nutrition';
import type { MacroPercentages, MacroTotals } from '../../types/nutrition';
import {
  macroChartTheme as chart,
  macroPieChartStyles as styles,
} from './MacroPieChart.styles';

const S = STRINGS.nutrition.macros;
const MACROS = ['protein', 'carbs', 'fats'] as const;

type MacroPieChartProps = {
  percentages: MacroPercentages;
  totals: MacroTotals;
};

/**
 * Donut of today's macro split. Slices carry a 2px surface gap; the legend
 * always spells out percent + grams (required relief for the lower-contrast
 * amber/teal slices).
 */
export function MacroPieChart({ percentages, totals }: MacroPieChartProps) {
  const data = MACROS.map((macro) => ({
    key: macro,
    name: S.labels[macro],
    value: percentages[macro],
    grams: totals[macro],
  })).filter((entry) => entry.value > 0);

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={styles.empty}>
          {S.empty}
        </Typography>
      ) : (
        <>
          <Box sx={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  stroke={chart.sliceStroke}
                  strokeWidth={chart.sliceStrokeWidth}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={MACRO_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chart.tooltip}
                  formatter={(value, name, entry) => {
                    const grams = (entry?.payload as { grams?: number })?.grams ?? 0;
                    return [`${value as number}% · ${grams}g`, name as string];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box sx={styles.legend}>
            {data.map((entry) => (
              <Stack key={entry.key} sx={styles.legendRow}>
                <Box component="span" sx={styles.legendDot(MACRO_COLORS[entry.key])} />
                <Typography variant="caption" color="text.secondary">
                  {S.legendItem(entry.name, entry.value, entry.grams)}
                </Typography>
              </Stack>
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
}
