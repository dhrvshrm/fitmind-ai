import type { SxProps, Theme } from '@mui/material';

export const myFoodsStyles = {
  skeleton: {
    height: 64,
  },
  list: {
    pt: 1,
    pb: 0.5,
  },
  item: {
    px: { xs: 2, sm: 2.5 },
  },
  form: {
    display: 'grid',
    gap: 1.5,
    pt: 1,
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  fullRow: {
    gridColumn: '1 / -1',
  },
  actions: {
    px: 3,
    pb: 2.5,
  },
} satisfies Record<string, SxProps<Theme>>;
