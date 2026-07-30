import {
  Alert,
  Box,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STRINGS } from "../../constants/strings";
import { bucketWorkoutsByWeek } from "../../utils/dashboardCharts";
import type { WorkoutRateResult } from "../../types/dashboard";
import { dashboardChartTheme as chart } from "./dashboardChartTheme";
import { workoutRateChartStyles as styles } from "./WorkoutRateChart.styles";

const S = STRINGS.dashboard.charts.workoutRate;

type WorkoutRateChartProps = {
  result: WorkoutRateResult | null;
  loading: boolean;
  error: string | null;
};

/** Workouts per week (last 30 days, bucketed) with the overall completion rate. */
export function WorkoutRateChart({
  result,
  loading,
  error,
}: WorkoutRateChartProps) {
  const buckets = result ? bucketWorkoutsByWeek(result.data) : [];
  const hasData = result ? result.summary.total_workouts > 0 : false;

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
        {result && (
          <Chip
            label={S.completionRate(result.summary.completion_rate)}
            color="primary"
            variant="outlined"
            size="small"
            sx={styles.rateChip}
          />
        )}
      </Stack>

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
            <BarChart
              data={buckets}
              margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke={chart.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={chart.tick}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={chart.tick}
              />
              <Tooltip
                contentStyle={chart.tooltip}
                formatter={(value) => [value as number, S.tooltipWorkouts]}
              />
              <Bar
                dataKey="workouts"
                fill={chart.purple}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
