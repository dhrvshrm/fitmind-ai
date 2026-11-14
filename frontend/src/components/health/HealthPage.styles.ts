import type { SxProps, Theme } from '@mui/material';

export const healthPageStyles = {
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 7fr) minmax(0, 4fr)' },
    alignItems: 'start',
  },
  column: {
    minWidth: 0,
  },
  // The side cards follow the page down while the long form scrolls.
  side: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
    position: { lg: 'sticky' },
    top: { lg: 88 },
  },
  disclaimer: {
    display: 'flex',
    gap: 1,
    alignItems: 'flex-start',
    mt: 3,
    maxWidth: 720,
  },
  disclaimerIcon: {
    color: 'text.secondary',
    fontSize: 16,
    mt: '1px',
  },
} satisfies Record<string, SxProps<Theme>>;
