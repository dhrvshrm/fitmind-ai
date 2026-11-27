import { Box, Paper, Typography } from '@mui/material';
import { SportsRounded } from '@mui/icons-material';
import type { Exercise } from '../../types/workout';
import { IconBadge } from '../ui/IconBadge';
import { drillCardStyles as styles } from './DrillCard.styles';

/** A sport drill: what to do, how much, and what it's for (no sets to log). */
export function DrillCard({ drill }: { drill: Exercise }) {
  return (
    <Paper variant="outlined" sx={styles.card}>
      <IconBadge icon={SportsRounded} tone="secondary" />
      <Box sx={styles.text}>
        <Typography variant="subtitle1" component="h4" sx={styles.name}>
          {drill.name}
        </Typography>
        <Typography variant="body2">{drill.reps}</Typography>
        {drill.effort && (
          <Typography variant="caption" color="text.secondary">
            {drill.effort}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
