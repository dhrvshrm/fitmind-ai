import { Box, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { FitnessCenterRounded, TrendingDownRounded, TrendingFlatRounded, TrendingUpRounded } from '@mui/icons-material';
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { PROGRESSION_STRINGS } from '../../constants/progressionStrings';
import { useStrength } from '../../hooks/queries/useWorkoutQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { useChartTheme } from '../../hooks/useChartTheme';
import { formatDateLabel } from '../../utils/date';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { SectionCard } from '../ui/SectionCard';
import { strengthCardStyles as styles } from './StrengthCard.styles';

const S = PROGRESSION_STRINGS.strength;

function changeIcon(percent: number) {
  if (percent > 0) return <TrendingUpRounded />;
  return percent < 0 ? <TrendingDownRounded /> : <TrendingFlatRounded />;
}

/** Most-trained weighted lifts: estimated max now, change over recent weeks, and a small trend line. */
export function StrengthCard() {
  const strength = useStrength();
  const chart = useChartTheme();
  const data = strength.data;
  const error = queryErrorMessage(strength.error, S.error);

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      {strength.isPending && <Skeleton variant="rounded" height={160} />}
      {error && !data && <ErrorState message={error} onRetry={() => strength.refetch()} />}
      {data && data.lifts.length === 0 && (
        <EmptyState compact icon={FitnessCenterRounded} title={S.emptyTitle} description={S.emptyBody} />
      )}
      {data && data.lifts.length > 0 && (
        <Box sx={styles.grid}>
          {data.lifts.map((lift) => (
            <Box key={lift.exercise_id} sx={styles.lift}>
              <Stack sx={styles.liftHead}>
                <Typography variant="body2" sx={styles.name} noWrap>
                  {lift.name}
                </Typography>
                {lift.change_percent != null ? (
                  <Chip
                    size="small"
                    icon={changeIcon(lift.change_percent)}
                    color={lift.change_percent > 0 ? 'success' : 'default'}
                    variant="outlined"
                    label={S.change(lift.change_percent, data.change_days)}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {S.noChange}
                  </Typography>
                )}
              </Stack>
              <Stack sx={styles.valueRow}>
                <Typography variant="h6" component="p" sx={styles.value}>
                  {S.current(lift.current_estimated_max_kg)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {S.sessions(lift.sessions)}
                </Typography>
              </Stack>
              {lift.points.length > 1 && (
                <Box sx={styles.spark}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lift.points.map((p) => ({ ...p, label: formatDateLabel(p.date) }))}>
                      <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip
                        contentStyle={chart.tooltip}
                        labelStyle={chart.tooltipLabel}
                        itemStyle={chart.tooltipItem}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                        formatter={(value) => [S.current(value as number), S.title]}
                      />
                      <Line type="monotone" dataKey="estimated_max_kg" stroke={chart.purple} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}
