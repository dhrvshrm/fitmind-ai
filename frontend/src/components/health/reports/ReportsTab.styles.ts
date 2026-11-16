import type { SxProps, Theme } from '@mui/material';

export const reportsTabStyles = {
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 4fr)' },
    alignItems: 'start',
  },
  main: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
  },
  // The report list and privacy stay in view while results scroll.
  side: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
    position: { lg: 'sticky' },
    top: { lg: 88 },
  },
} satisfies Record<string, SxProps<Theme>>;
