import type { SxProps, Theme } from '@mui/material';

export const mealHistoryStyles = {
  list: {
    pt: 1,
    pb: 0.5,
  },
  item: {
    px: { xs: 2, sm: 2.5 },
    py: 1.25,
    gap: 1.5,
  },
  typeIcon: {
    color: 'text.secondary',
    display: 'flex',
  },
  mealName: {
    fontWeight: 500,
  },
  kcal: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, SxProps<Theme>>;
