import type { SxProps, Theme } from '@mui/material';

export const nutritionPageStyles = {
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
  chartsRow: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
    alignItems: 'stretch',
  },
  skeleton: {
    height: 220,
  },
  skeletonTall: {
    height: 200,
  },
} satisfies Record<string, SxProps<Theme>>;
