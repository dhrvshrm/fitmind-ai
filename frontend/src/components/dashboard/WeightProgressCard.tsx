import { useState } from 'react';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { AddRounded, MonitorWeightRounded } from '@mui/icons-material';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { useWeightProgress } from '../../hooks/queries/useProgressQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { useChartTheme } from '../../hooks/useChartTheme';
import { wholeNumberDomain } from '../../utils/chartDomain';
import { formatDateLabel } from '../../utils/date';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { SectionCard } from '../ui/SectionCard';
import { LogProgressDialog } from './LogProgressDialog';
import { TrendDirectionChip } from './TrendDirectionChip';
import { weightProgressCardStyles as styles } from './WeightProgressCard.styles';

const S = PROGRESS_STRINGS.weight;

/** Raw weigh-ins as dots with the smoothed trend line through them. */
export function WeightProgressCard() {
  const weight = useWeightProgress();
  const chart = useChartTheme();
  const [open, setOpen] = useState(false);
  const error = queryErrorMessage(weight.error, S.error);
  const data = weight.data;
  const summary = data?.summary;
  const points = (data?.points ?? []).map((p) => ({ ...p, label: formatDateLabel(p.date) }));

  const action = (
    <Button size="small" startIcon={<AddRounded />} onClick={() => setOpen(true)}>
      {S.add}
    </Button>
  );

  return (
    <SectionCard title={S.title} subtitle={S.subtitle} action={action}>
      {weight.isPending && <Skeleton variant="rounded" sx={styles.chart} />}
      {error && !data && <ErrorState message={error} onRetry={() => weight.refetch()} />}
      {data && points.length === 0 && (
        <EmptyState compact icon={MonitorWeightRounded} title={S.emptyTitle} description={S.emptyBody} />
      )}
      {data && points.length === 1 && (
        <EmptyState
          compact
          icon={MonitorWeightRounded}
          title={S.firstTitle(points[0].weight)}
          description={S.firstBody}
        />
      )}
      {data && points.length > 1 && summary && (
        <>
          <Stack sx={styles.summaryRow}>
            {summary.current_trend !== null && (
              <Typography variant="body2" color="text.secondary">
                {S.summary(summary.current_trend, summary.weekly_rate)}
              </Typography>
            )}
            <TrendDirectionChip direction={summary.direction} />
          </Stack>
          <Box sx={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={chart.tick} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tick={chart.tick} domain={wholeNumberDomain(1)} allowDecimals={false} />
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelStyle={chart.tooltipLabel}
                  itemStyle={chart.tooltipItem}
                  formatter={(value, name) => [value as number, name === 'trend' ? S.tooltipTrend : S.tooltipWeight]}
                />
                <Scatter dataKey="weight" name="weight" fill={chart.purpleMuted} />
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="trend"
                  stroke={chart.purple}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
          <Stack sx={styles.legendRow}>
            <Stack sx={styles.legendItem}>
              <Box component="span" sx={styles.legendDot} />
              <Typography variant="caption" color="text.secondary">
                {S.weightLegend}
              </Typography>
            </Stack>
            <Stack sx={styles.legendItem}>
              <Box component="span" sx={styles.legendLine} />
              <Typography variant="caption" color="text.secondary">
                {S.trendLegend}
              </Typography>
            </Stack>
          </Stack>
        </>
      )}
      <LogProgressDialog open={open} mode="weight" onClose={() => setOpen(false)} />
    </SectionCard>
  );
}
