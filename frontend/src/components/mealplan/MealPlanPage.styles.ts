import type { SxProps, Theme } from '@mui/material';

export const mealPlanPageStyles = {
  // One column, top to bottom: targets, notes, then the day. Wide enough for
  // meal cards to breathe, narrow enough that lines stay readable.
  layout: {
    display: 'grid',
    gap: 2.5,

  },
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
  },
  footer: {
    display: 'grid',
    gap: 0.5,
  },
  // Notes inside one alert: a tight list, one line per note.
  notes: {
    m: 0,
    pl: 2,
    display: 'grid',
    gap: 0.75,
  },
  section: {
    mt: 2,
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
