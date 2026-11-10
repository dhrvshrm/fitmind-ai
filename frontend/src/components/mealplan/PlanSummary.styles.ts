import type { SxProps, Theme } from '@mui/material';

export const planSummaryStyles = {
  rows: {
    display: 'grid',
    gap: { xs: 2, md: 3 },
    gridTemplateColumns: {
      xs: 'repeat(2, minmax(0, 1fr))',
      sm: 'repeat(3, minmax(0, 1fr))',
      md: 'repeat(5, minmax(0, 1fr))',
    },
  },
} satisfies Record<string, SxProps<Theme>>;
