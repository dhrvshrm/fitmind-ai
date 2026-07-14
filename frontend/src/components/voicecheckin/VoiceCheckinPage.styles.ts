import type { SxProps, Theme } from '@mui/material';

export const voiceCheckinPageStyles = {
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
  leftColumn: {
    display: 'grid',
    gap: 3,
  },
} satisfies Record<string, SxProps<Theme>>;
