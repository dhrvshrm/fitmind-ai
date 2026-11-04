import { alpha, type SxProps, type Theme } from '@mui/material';
import { RADIUS } from '../../theme';

export const todayWorkoutStyles = {
  root: {
    position: 'relative',
    minWidth: 0,
  },
  progressChip: {
    fontVariantNumeric: 'tabular-nums',
  },
  progressBar: {
    mb: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    mb: 2,
  },
  timerText: {
    fontVariantNumeric: 'tabular-nums',
    minWidth: 56,
  },
  list: {
    display: 'grid',
    gap: 1.5,
  },
  donePanel: {
    py: 4,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 1,
  },
  doneTitle: {
    mt: 1,
  },
  finishButton: {
    mt: 2,
  },
  skeleton: {
    height: 220,
  },
  celebrationOverlay: (theme: Theme) => ({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: `${RADIUS.lg}px`,
    bgcolor: alpha(theme.palette.background.paper, 0.9),
    zIndex: 2,
  }),
  celebrationText: {
    textAlign: 'center',
    color: 'success.main',
  },
} satisfies Record<string, SxProps<Theme>>;
