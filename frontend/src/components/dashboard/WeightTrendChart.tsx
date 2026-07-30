import { Alert, Box, Paper, Skeleton, Stack, Typography } from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STRINGS } from "../../constants/strings";
import { formatDateLabel } from "../../utils/date";
import { computeWeightTrendLine } from "../../utils/dashboardCharts";
import type { WeightTrendResult } from "../../types/dashboard";
import { dashboardChartTheme as chart } from "./dashboardChartTheme";
import { weightTrendChartStyles as styles } from "./WeightTrendChart.styles";

const S = STRINGS.dashboard.charts.weightTrend;

type WeightTrendChartProps = {
  result: WeightTrendResult | null;
  loading: boolean;
  error: string | null;
};

/** Body weight over the last 90 days, with a linear trend line once there's enough data. */
export function WeightTrendChart({
  result,
  loading,
  error,
}: WeightTrendChartProps) {
  const points = result?.data ?? [];
  const trendLine = computeWeightTrendLine(points);
  const data = points.map((p, i) => ({
    label: formatDateLabel(p.date),
    weight: p.weight,
    trend: trendLine ? trendLine[i].trend : undefined,
  }));

  const change = result?.summary.change ?? 0;

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Stack sx={styles.headerRow}>
        <Box>
          <Typography variant="h6" sx={styles.title}>
            {S.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.subtitle}
          </Typography>
        </Box>
        {result && result.summary.current_weight !== null && (
          <Box>
            <Typography variant="h6" sx={styles.currentValue}>
              {S.current(result.summary.current_weight)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={styles.changeText}
            >
              {change === 0 ? S.noChange : S.change(change)}
            </Typography>
          </Box>
        )}
      </Stack>

      {loading && <Skeleton variant="rounded" sx={styles.chartWrap} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && data.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={styles.empty}>
          {S.empty}
        </Typography>
      )}

      {!loading && !error && data.length > 0 && (
        <Box sx={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
            >
              <CartesianGrid stroke={chart.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={chart.tick}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={chart.tick}
                domain={["dataMin - 2", "dataMax + 2"]}
              />
              <Tooltip
                contentStyle={chart.tooltip}
                formatter={(value, name) => [
                  value as number,
                  name === "trend" ? S.trendLegend : S.tooltipWeight,
                ]}
              />
              <Line
                type="monotone"
                dataKey="weight"
                name="weight"
                stroke={chart.purple}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
              {trendLine && (
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="trend"
                  stroke={chart.purpleMuted}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {!loading && !error && trendLine && (
        <Stack sx={styles.legendRow}>
          <Stack sx={styles.legendItem}>
            <Box component="span" sx={styles.legendLineSolid} />
            <Typography variant="caption" color="text.secondary">
              {S.weightLegend}
            </Typography>
          </Stack>
          <Stack sx={styles.legendItem}>
            <Box component="span" sx={styles.legendLineDashed} />
            <Typography variant="caption" color="text.secondary">
              {S.trendLegend}
            </Typography>
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}
