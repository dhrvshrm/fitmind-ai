import type { SxProps, Theme } from '@mui/material';

export const workoutPageStyles = {
  tabs: {
    mb: 2,
  },
  generateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: { xs: 'flex-start', sm: 'flex-end' },
  },
  generateHint: {
    display: 'block',
    mt: 0.5,
  },
  content: {
    display: 'grid',
    gap: 2,
  },
  splitRow: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '7fr 5fr' },
    alignItems: 'start',
  },
  planSkeleton: {
    height: 180,
  },
} satisfies Record<string, SxProps<Theme>>;
