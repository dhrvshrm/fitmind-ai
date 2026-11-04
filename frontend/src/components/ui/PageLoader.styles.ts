import type { SxProps, Theme } from '@mui/material';

export const pageLoaderStyles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
  },
} satisfies Record<string, SxProps<Theme>>;
