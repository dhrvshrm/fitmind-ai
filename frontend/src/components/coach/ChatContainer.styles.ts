import type { SxProps, Theme } from '@mui/material';

export const chatContainerStyles = {
  root: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    px: { xs: 1.5, sm: 2 },
    py: 2,
  },
  empty: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
} satisfies Record<string, SxProps<Theme>>;
