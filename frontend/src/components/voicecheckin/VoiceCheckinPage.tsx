import { useState } from 'react';
import { Box } from '@mui/material';
import { VoiceRecorder } from './VoiceRecorder';
import { MoodResult } from './MoodResult';
import { MoodHistory } from './MoodHistory';
import { STRINGS } from '../../constants/strings';
import type { VoiceCheckinResult } from '../../types/voiceCheckin';
import { PageHeader } from '../ui/PageHeader';
import { voiceCheckinPageStyles as styles } from './VoiceCheckinPage.styles';

const S = STRINGS.voiceCheckin;

export function VoiceCheckinPage() {
  // Latest analysis; history refreshes itself through query invalidation.
  const [result, setResult] = useState<VoiceCheckinResult | null>(null);

  return (
    <Box>
      <PageHeader title={S.title} subtitle={S.subtitle} />

      <Box sx={styles.grid}>
        <Box sx={styles.leftColumn}>
          <VoiceRecorder onResult={setResult} />
          {result && <MoodResult result={result} />}
        </Box>
        <MoodHistory />
      </Box>
    </Box>
  );
}
