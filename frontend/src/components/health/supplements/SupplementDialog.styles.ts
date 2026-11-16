import type { SxProps, Theme } from '@mui/material';

export const supplementDialogStyles = {
  fields: {
    display: 'grid',
    gap: 2,
    pt: 1,
  },
  product: {
    display: 'grid',
    gap: 1,
  },
  estimate: {
    justifySelf: 'start',
  },
  estimateNote: {
    mt: -1,
  },
  macrosHelp: {
    mb: 1.5,
  },
  macros: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  actions: {
    px: 3,
    pb: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
