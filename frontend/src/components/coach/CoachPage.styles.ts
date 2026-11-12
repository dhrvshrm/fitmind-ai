import type { SxProps, Theme } from '@mui/material';

export const coachPageStyles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100svh - 112px)',
    minHeight: 420,
  },
  statusChip: {
    fontWeight: 600,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
  },
  alert: {
    m: 1.5,
    mb: 0,
  },
  card: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  footer: {
    p: { xs: 1.5, sm: 2 },
    borderTop: 1,
    borderColor: 'divider',
  },
} satisfies Record<string, SxProps<Theme>>;
