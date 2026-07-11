import { Alert, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { STRINGS } from '../../constants/strings';
import { getScoreColorToken } from '../../utils/recovery';
import type { RecoveryScoreData } from '../../types/recovery';
import { recoveryScoreCardStyles as styles } from './RecoveryScoreCard.styles';

const S = STRINGS.recovery.score;

type RecoveryScoreCardProps = {
  data: RecoveryScoreData | null;
  loading: boolean;
  error: string | null;
};

/**
 * Large color-coded recovery score (0–100) with the backend's recommendation
 * and explanation. Band colors: red <40, yellow 40–70, green >70.
 */
export function RecoveryScoreCard({ data, loading, error }: RecoveryScoreCardProps) {
  const color = data ? getScoreColorToken(data.score) : 'text.primary';

  return (
    <Paper variant="outlined" sx={styles.card}>
      <Typography variant="h6" sx={styles.title}>
        {S.title}
      </Typography>

      {loading && <Skeleton variant="text" sx={styles.skeletonScore} />}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && data && (
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
    </Paper>
  );
}
