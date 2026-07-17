import type { SxProps, Theme } from '@mui/material';

export const workoutPageStyles = {
  headerRow: {
    flexDirection: { xs: 'column', sm: 'row' },
    justifyContent: 'space-between',
    alignItems: { xs: 'flex-start', sm: 'center' },
    gap: 2,
  },
  title: {
    fontWeight: 700,
  },
  generateHint: {
    display: 'block',
    mt: 0.5,
  },
  content: {
    display: 'grid',
    gap: 3,
    mt: 3,
  },
  splitRow: {
    display: 'grid',
    gap: 3,
    gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
    alignItems: 'start',
  },
  emptyCard: {
    p: { xs: 3, sm: 5 },
    borderRadius: 3,
    textAlign: 'center',
  },
  emptyTitle: {
    fontWeight: 700,
    mb: 0.5,
  },
  planSkeleton: {
    borderRadius: 3,
    height: 180,
  },
} satisfies Record<string, SxProps<Theme>>;
