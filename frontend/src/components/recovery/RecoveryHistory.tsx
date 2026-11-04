import { useMemo } from 'react';
import { Box, Skeleton } from '@mui/material';
import { ShowChartRounded } from '@mui/icons-material';
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
import { useChartTheme } from '../../hooks/useChartTheme';
import { useRecoveryHistory } from '../../hooks/queries/useRecoveryQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { recoveryHistoryStyles as styles } from './RecoveryHistory.styles';

const S = STRINGS.recovery.history;

/** Single-series line chart of recovery scores over the last 14 days (the hook default). */
export function RecoveryHistory() {
  const chart = useChartTheme();
  const history = useRecoveryHistory();
  const error = queryErrorMessage(history.error, S.error);

  // Chart reads left->right, so flip the newest-first API order.
  const data = useMemo(
    () =>
      [...(history.data ?? [])]
        .reverse()
        .map((item) => ({ ...item, label: formatDateLabel(item.date) })),
    [history.data],
  );

  return (
    <SectionCard title={S.title}>
      {history.isPending && <Skeleton variant="rounded" sx={styles.chartWrap} />}

      {error && <ErrorState message={error} onRetry={() => history.refetch()} />}

      {history.isSuccess && data.length === 0 && (
        <EmptyState icon={ShowChartRounded} title={S.emptyTitle} description={S.empty} compact />
      )}

      {data.length > 0 && (
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
                labelStyle={chart.tooltipLabel}
                itemStyle={chart.tooltipItem}
                formatter={(value) => [value as number, S.tooltipLabel]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={chart.purple}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: chart.surface, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </SectionCard>
  );
}
