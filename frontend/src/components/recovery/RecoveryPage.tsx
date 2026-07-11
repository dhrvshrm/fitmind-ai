import { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { RecoveryLogForm } from './RecoveryLogForm';
import { RecoveryScoreCard } from './RecoveryScoreCard';
import { RecoveryHistory } from './RecoveryHistory';
import { recoveryService } from '../../services/recoveryService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import type { RecoveryHistoryItem, RecoveryScoreData } from '../../types/recovery';
import { recoveryPageStyles as styles } from './RecoveryPage.styles';

const S = STRINGS.recovery;
const HISTORY_DAYS = 14;

export function RecoveryPage() {
  const [score, setScore] = useState<RecoveryScoreData | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreLoading, setScoreLoading] = useState(true);

  const [history, setHistory] = useState<RecoveryHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  /** Loads score + history in parallel; reused after each successful log. */
  const refresh = useCallback(async () => {
    setScoreLoading(true);
    setHistoryLoading(true);
    setScoreError(null);
    setHistoryError(null);

    const [scoreResult, historyResult] = await Promise.allSettled([
      recoveryService.getRecoveryScore(),
      recoveryService.getRecoveryHistory(HISTORY_DAYS),
    ]);

    if (scoreResult.status === 'fulfilled') setScore(scoreResult.value);
    else setScoreError(resolveApiError(scoreResult.reason, S.score.error));
    setScoreLoading(false);

    if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
    else setHistoryError(resolveApiError(historyResult.reason, S.history.error));
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Box>
      <Typography variant="h5" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {S.subtitle}
      </Typography>

      <Box sx={styles.grid}>
        <RecoveryLogForm onLogged={refresh} />
        <Box sx={styles.rightColumn}>
          <RecoveryScoreCard data={score} loading={scoreLoading} error={scoreError} />
          <RecoveryHistory items={history} loading={historyLoading} error={historyError} />
        </Box>
      </Box>
    </Box>
  );
}
