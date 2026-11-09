import type { SxProps, Theme } from '@mui/material';

export const swapFoodDialogStyles = {
  content: {
    display: 'grid',
    gap: 1.5,
    // Leaves room for the search field's floating label.
    pt: '8px !important',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    py: 2,
  },
  list: {
    maxHeight: 320,
    overflowY: 'auto',
  },
  option: {
    gap: 1,
    borderRadius: 1,
  },
  number: {
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, SxProps<Theme>>;
