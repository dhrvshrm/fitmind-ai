import type { SxProps, Theme } from '@mui/material';

export const appLayoutStyles = {
  root: {
    display: 'flex',
    minHeight: '100svh',
    bgcolor: 'background.default',
  },
  main: {
    flexGrow: 1,
    p: { xs: 2, sm: 3 },
    minWidth: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
