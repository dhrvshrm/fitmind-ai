import type { SxProps, Theme } from '@mui/material';

export const messModeDialogStyles = {
  intro: {
    mb: 2.5,
  },
  actions: {
    px: 3,
    pb: 2,
    gap: 1,
  },
  // Turning off sits apart, on the left.
  turnOff: {
    mr: 'auto',
  },
} satisfies Record<string, SxProps<Theme>>;
