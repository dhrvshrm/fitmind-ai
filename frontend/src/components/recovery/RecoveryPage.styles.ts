import type { SxProps, Theme } from '@mui/material';

export const recoveryPageStyles = {
  title: {
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gap: 3,
    gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
    mt: 3,
    alignItems: 'start',
  },
  rightColumn: {
    display: 'grid',
    gap: 3,
  },
} satisfies Record<string, SxProps<Theme>>;
