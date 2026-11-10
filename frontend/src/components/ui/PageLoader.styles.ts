import type { SxProps, Theme } from '@mui/material';

export const pageLoaderStyles = {
  root: {
    width: '100%',
    p: { xs: 2, sm: 3 },
  },
  title: {
    width: 220,
    fontSize: 34,
  },
  subtitle: {
    width: { xs: '80%', sm: 420 },
    mb: 3,
  },
  grid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
  },
  card: {
    height: 180,
  },
} satisfies Record<string, SxProps<Theme>>;
