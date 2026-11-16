import type { SxProps, Theme } from '@mui/material';

export const addBiomarkerDialogStyles = {
  subtitle: {
    mb: 2,
  },
  fields: {
    display: 'grid',
    gap: 2,
    pt: 0.5,
  },
  actions: {
    px: 3,
    pb: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
