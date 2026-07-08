import type { SxProps, Theme } from '@mui/material';

export const protectedRouteStyles = {
  loader: {
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
} satisfies Record<string, SxProps<Theme>>;
