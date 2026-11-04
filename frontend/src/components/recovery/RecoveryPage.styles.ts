import type { SxProps, Theme } from '@mui/material';

export const recoveryPageStyles = {
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '5fr 7fr' },
    alignItems: 'start',
  },
  rightColumn: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
