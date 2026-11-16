import { Box, Typography } from '@mui/material';
import { DirectionsWalkRounded } from '@mui/icons-material';
import { BODY_SCAN_STRINGS } from '../../constants/bodyScanStrings';
import type { Finisher } from '../../types/workout';
import { finisherNoteStyles as styles } from './FinisherNote.styles';

const S = BODY_SCAN_STRINGS.workout;

/** Easy conditioning after the strength work, added when a body scan shows high body fat. */
export function FinisherNote({ finisher }: { finisher: Finisher }) {
  return (
    <Box sx={styles.root}>
      <DirectionsWalkRounded sx={styles.icon} />
      <Box>
        <Typography variant="body2" sx={styles.title}>
          {S.finisherTitle(finisher.minutes)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {finisher.gym ? S.finisherGym : S.finisherHome}
        </Typography>
      </Box>
    </Box>
  );
}
