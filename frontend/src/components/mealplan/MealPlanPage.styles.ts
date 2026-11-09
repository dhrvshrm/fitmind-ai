import type { SxProps, Theme } from '@mui/material';

export const mealPlanPageStyles = {
  layout: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '2fr 1fr' },
    alignItems: 'start',
  },
  meals: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
  },
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
    alignItems: 'stretch',
  },
  side: {
    display: 'grid',
    gap: 1.5,
    minWidth: 0,
    // On phones the day's totals come first, above the meals.
    order: { xs: -1, lg: 0 },
  },
  emptyActions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 1,
  },
  skeleton: {
    height: 260,
  },
} satisfies Record<string, SxProps<Theme>>;
