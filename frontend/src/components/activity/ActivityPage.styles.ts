import type { SxProps, Theme } from '@mui/material';

export const activityPageStyles = {
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 6fr) minmax(0, 5fr)' },
    alignItems: 'start',
  },
  column: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
