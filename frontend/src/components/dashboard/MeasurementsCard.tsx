import { useState } from 'react';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { AddRounded, StraightenRounded } from '@mui/icons-material';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { useMeasurements } from '../../hooks/queries/useProgressQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { useChartTheme } from '../../hooks/useChartTheme';
import { wholeNumberDomain } from '../../utils/chartDomain';
import type { MeasurementSeries, Measurements } from '../../types/progress';
import { formatDateLabel } from '../../utils/date';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { SectionCard } from '../ui/SectionCard';
import { LogProgressDialog } from './LogProgressDialog';
import { TrendDirectionChip } from './TrendDirectionChip';
import { measurementsCardStyles as styles } from './MeasurementsCard.styles';

const S = PROGRESS_STRINGS.measurements;

type Row = { date: string; label: string; waist?: number; hip?: number };

function mergeByDate(data: Measurements): Row[] {
  const rows = new Map<string, Row>();
  const add = (series: MeasurementSeries, key: 'waist' | 'hip') => {
    for (const point of series.points) {
      const row = rows.get(point.date) ?? { date: point.date, label: formatDateLabel(point.date) };
      row[key] = point.trend;
      rows.set(point.date, row);
    }
  };
  add(data.waist, 'waist');
  add(data.hip, 'hip');
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function SeriesSummary({ label, series }: { label: string; series: MeasurementSeries }) {
  const { current_trend: current, change, direction } = series.summary;
  if (current === null) return null;
  return (
    <Box sx={styles.summaryItem}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" component="p" sx={styles.value}>
        {S.current(current)}
      </Typography>
      <Stack sx={styles.changeRow}>
        {series.summary.entries > 1 && (
          <Typography variant="caption" color="text.secondary">
            {S.change(change)}
          </Typography>
        )}
        <TrendDirectionChip direction={direction} />
      </Stack>
    </Box>
  );
}

/** Waist (and optional hip) trend: the tape often shows change the scale hides. */
export function MeasurementsCard() {
  const measurements = useMeasurements();
  const chart = useChartTheme();
  const [open, setOpen] = useState(false);
  const data = measurements.data;
  const error = queryErrorMessage(measurements.error, S.error);
  const rows = data ? mergeByDate(data) : [];
  const hasHip = Boolean(data?.hip.points.length);

  const action = (
    <Button size="small" startIcon={<AddRounded />} onClick={() => setOpen(true)}>
      {S.add}
    </Button>
  );

  return (
    <SectionCard title={S.title} subtitle={S.subtitle} action={action}>
      {measurements.isPending && <Skeleton variant="rounded" sx={styles.chart} />}
      {error && !data && <ErrorState message={error} onRetry={() => measurements.refetch()} />}
      {data && rows.length === 0 && (
        <EmptyState compact icon={StraightenRounded} title={S.emptyTitle} description={S.emptyBody} />
      )}
      {data && rows.length > 0 && (
        <>
          <Box sx={styles.summary}>
            <SeriesSummary label={S.waist} series={data.waist} />
            <SeriesSummary label={S.hip} series={data.hip} />
          </Box>
          {rows.length > 1 && (
            <Box sx={styles.chart}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={chart.tick} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tick={chart.tick} domain={wholeNumberDomain(2)} allowDecimals={false} />
                  <Tooltip
                    contentStyle={chart.tooltip}
                    labelStyle={chart.tooltipLabel}
                    itemStyle={chart.tooltipItem}
                    formatter={(value, name) => [value as number, name === 'hip' ? S.tooltipHip : S.tooltipWaist]}
                  />
                  <Line type="monotone" dataKey="waist" name="waist" stroke={chart.purple} strokeWidth={2.5} dot={false} connectNulls />
                  {hasHip && (
                    <Line type="monotone" dataKey="hip" name="hip" stroke={chart.fats} strokeWidth={2} dot={false} connectNulls />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </>
      )}
      <LogProgressDialog open={open} mode="measurement" onClose={() => setOpen(false)} />
    </SectionCard>
  );
}
