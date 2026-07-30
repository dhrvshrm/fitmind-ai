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
  TrendingDownRounded,
  TrendingFlatRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
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
import { getScoreHexColor, RECOVERY_BAND_HEX } from "../../utils/recovery";
import type { RecoveryTrendResult } from "../../types/dashboard";
import { dashboardChartTheme as chart } from "./dashboardChartTheme";
import { recoveryTrendChartStyles as styles } from "./RecoveryTrendChart.styles";

const S = STRINGS.dashboard.charts.recoveryTrend;

const TREND_META = {
  up: { Icon: TrendingUpRounded, color: "success" as const },
  down: { Icon: TrendingDownRounded, color: "error" as const },
  flat: { Icon: TrendingFlatRounded, color: "default" as const },
};

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: { score: number };
};

/** Recovery-score dot colored by band (red/amber/green), ringed for contrast. */
function RecoveryDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={getScoreHexColor(payload.score)}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

type RecoveryTrendChartProps = {
  result: RecoveryTrendResult | null;
  loading: boolean;
  error: string | null;
};

/** Recovery score over the last 14 days; each point colored by its band. */
export function RecoveryTrendChart({
  result,
  loading,
  error,
}: RecoveryTrendChartProps) {
  const data =
    result?.data.map((d) => ({ ...d, label: formatDateLabel(d.date) })) ?? [];
  const trendMeta = result ? TREND_META[result.summary.trend] : null;

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
        {trendMeta && data.length > 0 && (
          <Chip
            icon={<trendMeta.Icon fontSize="small" />}
            label={result?.summary.average_score}
            color={trendMeta.color}
            variant="outlined"
            size="small"
            sx={styles.trendChip}
          />
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
        <>
          <Box sx={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
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
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={chart.tick}
                />
                <Tooltip
                  contentStyle={chart.tooltip}
                  formatter={(value) => [value as number, S.tooltipScore]}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={chart.purple}
                  strokeWidth={2}
                  dot={<RecoveryDot />}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          <Stack sx={styles.legendRow}>
            <Stack sx={styles.legendItem}>
              <Box
                component="span"
                sx={styles.legendDot(RECOVERY_BAND_HEX.low)}
              />
              <Typography variant="caption" color="text.secondary">
                {S.bands.low}
              </Typography>
            </Stack>
            <Stack sx={styles.legendItem}>
              <Box
                component="span"
                sx={styles.legendDot(RECOVERY_BAND_HEX.moderate)}
              />
              <Typography variant="caption" color="text.secondary">
                {S.bands.moderate}
              </Typography>
            </Stack>
            <Stack sx={styles.legendItem}>
              <Box
                component="span"
                sx={styles.legendDot(RECOVERY_BAND_HEX.good)}
              />
              <Typography variant="caption" color="text.secondary">
                {S.bands.good}
              </Typography>
            </Stack>
          </Stack>
        </>
      )}
    </Paper>
  );
}
