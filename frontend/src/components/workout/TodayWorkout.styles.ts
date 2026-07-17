import type { SxProps, Theme } from '@mui/material';

export const todayWorkoutStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 1.5,
  },
  title: {
    fontWeight: 700,
  },
  progressChip: {
    fontWeight: 700,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    mb: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    mb: 2,
  },
  timerText: {
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 56,
  },
  list: {
    display: 'grid',
    gap: 1.5,
  },
  restDay: {
    py: 4,
    textAlign: 'center',
  },
  donePanel: {
    py: 4,
    textAlign: 'center',
  },
  doneIcon: {
    fontSize: 48,
    color: 'success.main',
    mb: 1,
  },
  doneTitle: {
    fontWeight: 700,
  },
  finishButton: {
    mt: 2,
  },
  celebrationOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'rgba(255, 255, 255, 0.88)',
    zIndex: 2,
  },
  celebrationText: {
    fontWeight: 800,
    textAlign: 'center',
  },
} satisfies Record<string, SxProps<Theme>>;
