import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { AutoAwesomeRounded, CheckCircleOutlineRounded, EventNoteRounded, LightbulbOutlined } from '@mui/icons-material';
import { PROGRESS_STRINGS } from '../../constants/progressStrings';
import { useWeeklyInsight } from '../../hooks/queries/useProgressQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { formatDateLabel } from '../../utils/date';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { SectionCard } from '../ui/SectionCard';
import { weeklyInsightCardStyles as styles } from './WeeklyInsightCard.styles';

const S = PROGRESS_STRINGS.insight;

/** A short note on last week: one thing that went well and one thing to change. */
export function WeeklyInsightCard() {
  const insight = useWeeklyInsight();
  const data = insight.data;
  const error = queryErrorMessage(insight.error, S.error);
  const subtitle = data ? S.subtitle(formatDateLabel(data.week_start), formatDateLabel(data.week_end)) : undefined;

  return (
    <SectionCard title={S.title} subtitle={subtitle} action={<AutoAwesomeRounded color="primary" fontSize="small" />}>
      {insight.isPending && <Skeleton variant="rounded" height={140} />}
      {error && !data && <ErrorState message={error} onRetry={() => insight.refetch()} />}
      {data?.status === 'not_enough_data' && (
        <EmptyState
          compact
          icon={EventNoteRounded}
          title={S.emptyTitle}
          description={S.emptyBody(data.required_active_days)}
        />
      )}
      {data?.status === 'ready' && (
        <Stack sx={styles.stack}>
          <Typography variant="h6" component="p" sx={styles.headline}>
            {data.headline}
          </Typography>
          <Box sx={styles.row}>
            <CheckCircleOutlineRounded color="success" fontSize="small" sx={styles.icon} />
            <Box>
              <Typography variant="overline" color="text.secondary" sx={styles.label}>
                {S.wentWell}
              </Typography>
              <Typography variant="body2">{data.went_well}</Typography>
            </Box>
          </Box>
          <Box sx={styles.row}>
            <LightbulbOutlined color="warning" fontSize="small" sx={styles.icon} />
            <Box>
              <Typography variant="overline" color="text.secondary" sx={styles.label}>
                {S.oneChange}
              </Typography>
              <Typography variant="body2">{data.one_change}</Typography>
            </Box>
          </Box>
        </Stack>
      )}
    </SectionCard>
  );
}
