import { Box, Typography } from '@mui/material';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { StepDay } from '../../types/activity';
import { formatDateLabel } from '../../utils/date';
import { stepsChartStyles as styles } from './StepsChart.styles';

const S = ACTIVITY_STRINGS.steps;

type StepsChartProps = {
  days: StepDay[];
  target: number;
};

type ChartRow = { label: string; steps: number; logged: boolean };

/** Daily steps as bars with the target as a dashed line. Days not logged show no bar. */
export function StepsChart({ days, target }: StepsChartProps) {
  const chart = useChartTheme();
  const data: ChartRow[] = days.map((day) => ({
    label: formatDateLabel(day.date),
    steps: day.steps ?? 0,
    logged: day.steps !== null,
  }));

  return (
    <Box>
      <Typography variant="subtitle2" sx={styles.title}>
        {S.chartTitle}
      </Typography>
      <Box sx={styles.chartWrap} role="img" aria-label={S.chartAria}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <XAxis dataKey="label" tick={chart.tick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={chart.tick} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              cursor={chart.cursor}
              contentStyle={chart.tooltip}
              labelStyle={chart.tooltipLabel}
              itemStyle={chart.tooltipItem}
              formatter={(value, _name, item) =>
                (item?.payload as ChartRow | undefined)?.logged ? [S.tooltip(Number(value)), ''] : [S.notLogged, '']
              }
              separator=""
            />
            <ReferenceLine
              y={target}
              stroke={chart.axis}
              strokeDasharray="4 4"
              label={{ value: S.chartTarget, position: 'insideTopRight', fill: chart.axis, fontSize: 11 }}
            />
            <Bar dataKey="steps" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {data.map((row) => (
                <Cell key={row.label} fill={row.steps >= target ? chart.purple : chart.purpleMuted} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
