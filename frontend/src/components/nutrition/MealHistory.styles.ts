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
    alignItems: 'flex-start',
  },
  typeIcon: {
    color: 'text.secondary',
    display: 'flex',
    pt: 0.5,
  },
  mealName: {
    fontWeight: 500,
  },
  secondary: {
    gap: 0.25,
  },
  right: {
    alignItems: 'flex-end',
    gap: 0.5,
    flexShrink: 0,
  },
  kcal: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  deleteItem: {
    color: 'error.main',
  },
} satisfies Record<string, SxProps<Theme>>;
