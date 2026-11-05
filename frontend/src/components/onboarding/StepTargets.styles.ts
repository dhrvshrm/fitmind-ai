import type { SxProps, Theme } from '@mui/material';

export const stepTargetsStyles = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    py: 3,
  },
} satisfies Record<string, SxProps<Theme>>;
