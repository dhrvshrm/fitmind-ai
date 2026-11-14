import type { SxProps, Theme } from '@mui/material';

export const planEffectsCardStyles = {
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1.5,
  },
  item: {
    display: 'flex',
    gap: 1.25,
    alignItems: 'flex-start',
  },
  icon: {
    mt: '1px',
    color: 'secondary.main',
  },
} satisfies Record<string, SxProps<Theme>>;
