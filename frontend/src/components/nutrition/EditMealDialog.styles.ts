import type { SxProps, Theme } from '@mui/material';

export const editMealDialogStyles = {
  fields: {
    gap: 2,
    pt: 1,
  },
  numbers: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  actions: {
    px: 3,
    pb: 2.5,
  },
} satisfies Record<string, SxProps<Theme>>;
