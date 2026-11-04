import type { SxProps, Theme } from '@mui/material';

export const comingSoonStyles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  card: {
    width: '100%',
    maxWidth: 440,
  },
} satisfies Record<string, SxProps<Theme>>;
