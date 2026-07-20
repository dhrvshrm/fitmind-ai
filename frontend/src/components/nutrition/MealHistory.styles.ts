import type { SxProps, Theme } from '@mui/material';

export const mealHistoryStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  title: {
    fontWeight: 700,
    mb: 1,
  },
  empty: {
    py: 4,
    textAlign: 'center',
  },
  mealName: {
    fontWeight: 600,
  },
  kcalChip: {
    fontWeight: 700,
  },
} satisfies Record<string, SxProps<Theme>>;
