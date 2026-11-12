import type { SxProps, Theme } from '@mui/material';

export const logProgressDialogStyles = {
  fields: {
    gap: 2,
    pt: 1,
  },
  actions: {
    px: 3,
    pb: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
