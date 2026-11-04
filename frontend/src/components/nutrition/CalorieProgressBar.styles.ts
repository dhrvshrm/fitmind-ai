import type { SxProps, Theme } from '@mui/material';

export const calorieProgressBarStyles = {
  progressText: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  bar: {
    height: 10,
  },
  remaining: {
    mt: 1,
    display: 'block',
  },
  macros: {
    mt: 2.5,
    pt: 2,
    gap: 1.75,
    borderTop: '1px solid',
    borderColor: 'divider',
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
  },
} satisfies Record<string, SxProps<Theme>>;
