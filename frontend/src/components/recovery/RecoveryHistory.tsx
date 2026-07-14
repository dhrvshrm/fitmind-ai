import { useMemo } from 'react';
import { Alert, Box, Paper, Skeleton, Typography } from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STRINGS } from '../../constants/strings';
import { formatDateLabel } from '../../utils/date';
import type { RecoveryHistoryItem } from '../../types/recovery';
import {
  recoveryChartTheme as chart,
  recoveryHistoryStyles as styles,
} from './RecoveryHistory.styles';

const S = STRINGS.recovery.history;

type RecoveryHistoryProps = {
  /** History items as returned by the API (newest first). */
  items: RecoveryHistoryItem[];
  loading: boolean;
  error: string | null;
};

/** Line chart of recovery scores over the requested window (single series). */
export function RecoveryHistory({ items, loading, error }: RecoveryHistoryProps) {
  // Chart reads left→right, so flip the newest-first API order.
  const data = useMemo(
    () =>
      [...items]
        .reverse()
        .map((item) => ({ ...item, label: formatDateLabel(item.date) })),
    [items],
  );

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

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
            <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
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
                formatter={(value) => [value as number, S.tooltipLabel]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={chart.line}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}
