import { Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { STRINGS } from '../../constants/strings';
import { formatTimestamp } from '../../utils/date';
import {
  getMoodSentiment,
  MOOD_COLOR_TOKEN,
  MOOD_EMOJI,
} from '../../utils/voiceCheckin';
import type { VoiceCheckinResult } from '../../types/voiceCheckin';
import { moodResultStyles as styles } from './MoodResult.styles';

const S = STRINGS.voiceCheckin.result;
const ENERGY_MAX = 10;

type MoodResultProps = {
  result: VoiceCheckinResult;
};

/** Animated card showing the analysed mood, energy gauge, and transcript. */
export function MoodResult({ result }: MoodResultProps) {
  const sentiment = getMoodSentiment(result.mood);

  return (
    <motion.div
      key={result.timestamp}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      <Paper variant="outlined" sx={styles.card}>
        <Typography variant="h6" sx={styles.title}>
          {S.title}
        </Typography>

        <Stack sx={styles.headerRow}>
          <Typography component="span" sx={styles.emoji} aria-hidden>
            {MOOD_EMOJI[sentiment]}
          </Typography>
          <Box>
            <Typography variant="h5" sx={styles.moodLabel(MOOD_COLOR_TOKEN[sentiment])}>
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
            sx={styles.energyBar}
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
      </Paper>
    </motion.div>
  );
}
