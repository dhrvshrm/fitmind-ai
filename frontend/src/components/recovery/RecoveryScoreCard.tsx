import { Skeleton, Stack, Typography } from '@mui/material';
import { MonitorHeartRounded } from '@mui/icons-material';
import { STRINGS } from '../../constants/strings';
import { getScoreColorToken } from '../../utils/recovery';
import { useRecoveryScore } from '../../hooks/queries/useRecoveryQueries';
import { queryErrorMessage } from '../../hooks/queries/queryHelpers';
import { SectionCard } from '../ui/SectionCard';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { recoveryScoreCardStyles as styles } from './RecoveryScoreCard.styles';

const S = STRINGS.recovery.score;

/**
 * Large color-coded recovery score (0 to 100) with the backend's recommendation
 * and explanation. Band colors: red below 40, amber 40 to 70, green above 70;
 * the recommendation text always accompanies the color.
 */
export function RecoveryScoreCard() {
  const score = useRecoveryScore();
  const data = score.data;
  const error = queryErrorMessage(score.error, S.error);
  const color = data ? getScoreColorToken(data.score) : 'text.primary';

  return (
    <SectionCard title={S.title}>
      {score.isPending && (
        <>
          <Skeleton variant="text" sx={styles.skeletonScore} />
          <Skeleton variant="text" sx={styles.skeletonLine} />
        </>
      )}

      {error && <ErrorState message={error} onRetry={() => score.refetch()} />}

      {score.isSuccess && !data && (
        <EmptyState icon={MonitorHeartRounded} title={S.emptyTitle} description={S.empty} compact />
      )}

      {data && (
        <>
          <Stack sx={styles.scoreRow}>
            <Typography component="span" sx={styles.score(color)}>
              {data.score}
            </Typography>
            <Typography component="span" variant="h6" sx={styles.outOf}>
              {S.outOf}
            </Typography>
          </Stack>
          <Typography variant="subtitle1" sx={styles.recommendation(color)}>
            {data.recommendation}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={styles.explanation}>
            {data.explanation}
          </Typography>
        </>
      )}
    </SectionCard>
  );
}
