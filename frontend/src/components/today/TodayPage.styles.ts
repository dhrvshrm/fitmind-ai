import type { SxProps, Theme } from '@mui/material';

export const todayPageStyles = {
  root: {
    maxWidth: 1100,
    mx: 'auto',
  },
  date: {
    display: 'block',
    color: 'primary.main',
    fontWeight: 700,
    letterSpacing: 1,
    mb: 0.5,
  },
  nudges: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
    mb: 2,
  },
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(12, minmax(0, 1fr))' },
  },
  wide: {
    gridColumn: { md: 'span 7' },
    minWidth: 0,
  },
  narrow: {
    gridColumn: { md: 'span 5' },
    minWidth: 0,
  },
  full: {
    gridColumn: { md: '1 / -1' },
    minWidth: 0,
  },
  section: {
    mb: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
