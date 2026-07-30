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
import { formatDateLabel } from "../../utils/date";
import type { XpWeeklyResult } from "../../types/dashboard";
import { dashboardChartTheme as chart } from "./dashboardChartTheme";
import { xpEarnedChartStyles as styles } from "./XPEarnedChart.styles";

const S = STRINGS.dashboard.charts.xpEarned;

type XPEarnedChartProps = {
  result: XpWeeklyResult | null;
  loading: boolean;
  error: string | null;
};

/** XP earned per day over the last 7 days, with the weekly total called out. */
export function XPEarnedChart({ result, loading, error }: XPEarnedChartProps) {
  const data =
    result?.data.map((d) => ({ ...d, label: formatDateLabel(d.date) })) ?? [];
  const hasData = result ? result.summary.weekly_total > 0 : false;

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
            label={S.weeklyTotal(result.summary.weekly_total)}
            color="primary"
            variant="outlined"
            size="small"
            sx={styles.totalChip}
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
              data={data}
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
                formatter={(value) => [value as number, S.tooltipXp]}
              />
              <Bar
                dataKey="xp"
                fill={chart.purple}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
