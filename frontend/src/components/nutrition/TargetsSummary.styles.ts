import type { SxProps, Theme } from '@mui/material';

export const targetsSummaryStyles = {
  root: {
    gap: 2,
  },
  grid: {
    display: 'grid',
    gap: 1,
    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
  },
  tile: {
    p: 1.5,
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'divider',
  },
  value: {
    fontVariantNumeric: 'tabular-nums',
  },
  howTitle: {
    mb: 0.5,
  },
  steps: {
    m: 0,
    mb: 1,
    pl: 2.5,
    display: 'grid',
    gap: 0.5,
  },
} satisfies Record<string, SxProps<Theme>>;
