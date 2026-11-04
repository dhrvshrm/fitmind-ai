import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { STRINGS } from '../../constants/strings';
import { formatTimestamp } from '../../utils/date';
import {
  getMoodSentiment,
  MOOD_COLOR_TOKEN,
  MOOD_ICON,
} from '../../utils/voiceCheckin';
import type { VoiceCheckinResult } from '../../types/voiceCheckin';
import { SectionCard } from '../ui/SectionCard';
import { moodResultStyles as styles } from './MoodResult.styles';

const S = STRINGS.voiceCheckin.result;
const ENERGY_MAX = 10;

type MoodResultProps = {
  result: VoiceCheckinResult;
};

/** Card showing the analysed mood, energy gauge, and transcript. */
export function MoodResult({ result }: MoodResultProps) {
  const sentiment = getMoodSentiment(result.mood);
  const MoodIcon = MOOD_ICON[sentiment];

  return (
    <motion.div
      key={result.timestamp}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <SectionCard title={S.title}>
        <Stack sx={styles.headerRow}>
          <MoodIcon sx={styles.moodIcon(MOOD_COLOR_TOKEN[sentiment])} aria-hidden />
          <Box sx={styles.moodText}>
            <Typography variant="h5" component="p" sx={styles.moodLabel(MOOD_COLOR_TOKEN[sentiment])}>
              {result.mood}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={styles.timestamp}>
              {formatTimestamp(result.timestamp)}
            </Typography>
          </Box>
        </Stack>

        <Box sx={styles.energyBlock}>
          <Stack sx={styles.energyRow}>
            <Typography variant="body2" sx={styles.energyLabel}>
              {S.energyLabel}
            </Typography>
            <Typography variant="body2" sx={styles.energyValue}>
              {result.energy_level} {S.energyOutOf}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={(result.energy_level / ENERGY_MAX) * 100}
            aria-label={S.energyLabel}
          />
        </Box>

        <Box sx={styles.transcriptBlock}>
          <Typography variant="body2" sx={styles.transcriptLabel}>
            {S.transcriptLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={styles.transcript}>
            {result.transcript || S.emptyTranscript}
          </Typography>
        </Box>
      </SectionCard>
    </motion.div>
  );
}
