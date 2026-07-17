import type { SxProps, Theme } from '@mui/material';

export const todayWorkoutStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 2,
  },
  title: {
    fontWeight: 700,
  },
  progressChip: {
    fontWeight: 700,
  },
  list: {
    display: 'grid',
    gap: 1.5,
  },
  restDay: {
    py: 4,
    textAlign: 'center',
  },
} satisfies Record<string, SxProps<Theme>>;
