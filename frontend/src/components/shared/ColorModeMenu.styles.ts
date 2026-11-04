import type { SxProps, Theme } from '@mui/material';

export const colorModeMenuStyles = {
  item: {
    minWidth: 180,
  },
  check: {
    ml: 'auto',
    color: 'primary.main',
  },
} satisfies Record<string, SxProps<Theme>>;
