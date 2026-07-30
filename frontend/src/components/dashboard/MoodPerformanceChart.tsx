import { Alert, Box, Paper, Skeleton, Typography } from "@mui/material";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STRINGS } from "../../constants/strings";
import type { MoodWorkoutPoint } from "../../types/dashboard";
import { dashboardChartTheme as chart } from "./dashboardChartTheme";
import { moodPerformanceChartStyles as styles } from "./MoodPerformanceChart.styles";

const S = STRINGS.dashboard.charts.moodPerformance;

/** Minimum joined points before a scatter can meaningfully suggest a pattern. */
const MIN_POINTS = 2;

type MoodPerformanceChartProps = {
  points: MoodWorkoutPoint[];
  loading: boolean;
  error: string | null;
};

/** Scatter of daily energy (mood) against that day's workout count, to eyeball correlation. */
export function MoodPerformanceChart({
  points,
  loading,
  error,
}: MoodPerformanceChartProps) {
  const hasData = points.length >= MIN_POINTS;
  const maxWorkouts = points.reduce((max, p) => Math.max(max, p.workouts), 0);

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {S.subtitle}
      </Typography>

      {loading && <Skeleton variant="rounded" sx={styles.chartWrap} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && !hasData && (
        <Typography variant="body2" color="text.secondary" sx={styles.empty}>
          {S.empty}
        </Typography>
      )}

      {!loading && !error && hasData && (
        <Box sx={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={chart.grid} />
              <XAxis
                type="number"
                dataKey="energy"
                name={S.xLabel}
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tickLine={false}
                axisLine={false}
                tick={chart.tick}
                label={{
                  value: S.xLabel,
                  position: "insideBottom",
                  offset: -4,
                  ...chart.tick,
                }}
              />
              <YAxis
                type="number"
                dataKey="workouts"
                name={S.yLabel}
                domain={[0, Math.max(1, maxWorkouts + 1)]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={chart.tick}
                label={{
                  value: S.yLabel,
                  angle: -90,
                  position: "insideLeft",
                  ...chart.tick,
                }}
              />
              <Tooltip
                contentStyle={chart.tooltip}
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value, name) => [
                  value as number,
                  name === "energy" ? S.tooltipEnergy : S.tooltipWorkouts,
                ]}
              />
              <Scatter
                data={points}
                fill={chart.purple}
                fillOpacity={0.75}
                r={6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
