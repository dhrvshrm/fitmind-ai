import type { SxProps, Theme } from '@mui/material';

export const nutritionPageStyles = {
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '6fr 5fr' },
    alignItems: 'start',
  },
  leftColumn: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
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
