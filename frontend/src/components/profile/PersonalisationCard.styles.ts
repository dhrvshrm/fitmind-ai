import type { SxProps, Theme } from '@mui/material';

export const personalisationCardStyles = {
  skeleton: {
    height: 120,
  },
  body: {
    gap: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
