import type { SxProps, Theme } from '@mui/material';

export const supplementsTabStyles = {
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 5fr) minmax(0, 7fr)' },
    alignItems: 'start',
  },
  // Today's ticks stay in view while the catalogue scrolls.
  side: {
    minWidth: 0,
    position: { lg: 'sticky' },
    top: { lg: 88 },
  },
  main: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
