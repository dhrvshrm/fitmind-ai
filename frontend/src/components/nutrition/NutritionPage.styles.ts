import type { SxProps, Theme } from '@mui/material';

export const nutritionPageStyles = {
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
  chartsRow: {
    display: 'grid',
    gap: 3,
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    alignItems: 'stretch',
  },
  skeleton: {
    borderRadius: 3,
    height: 140,
  },
} satisfies Record<string, SxProps<Theme>>;
