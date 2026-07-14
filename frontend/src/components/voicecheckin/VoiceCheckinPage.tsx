import { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { VoiceRecorder } from './VoiceRecorder';
import { MoodResult } from './MoodResult';
import { MoodHistory } from './MoodHistory';
import { voiceService } from '../../services/voiceService';
import { resolveApiError } from '../../lib/apiClient';
import { STRINGS } from '../../constants/strings';
import type { VoiceCheckinResult, VoiceHistoryItem } from '../../types/voiceCheckin';
import { voiceCheckinPageStyles as styles } from './VoiceCheckinPage.styles';

const S = STRINGS.voiceCheckin;

export function VoiceCheckinPage() {
  const [result, setResult] = useState<VoiceCheckinResult | null>(null);

  const [history, setHistory] = useState<VoiceHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await voiceService.getVoiceHistory());
    } catch (error) {
      setHistoryError(resolveApiError(error, S.history.error));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /** Show the fresh analysis and pull the updated history behind it. */
  function handleResult(checkin: VoiceCheckinResult) {
    setResult(checkin);
    loadHistory();
  }

  return (
    <Box>
      <Typography variant="h5" sx={styles.title}>
        {S.title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {S.subtitle}
      </Typography>

      <Box sx={styles.grid}>
        <Box sx={styles.leftColumn}>
          <VoiceRecorder onResult={handleResult} />
          {result && <MoodResult result={result} />}
        </Box>
        <MoodHistory items={history} loading={historyLoading} error={historyError} />
      </Box>
    </Box>
  );
}
