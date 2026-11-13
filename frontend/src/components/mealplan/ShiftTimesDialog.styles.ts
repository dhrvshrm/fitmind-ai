import type { SxProps, Theme } from '@mui/material';

export const shiftTimesDialogStyles = {
  content: {
    display: 'grid',
    gap: 2,
    // Room for the first field's floating label.
    pt: '8px !important',
  },
  times: {
    flexDirection: 'row',
    gap: 1.5,
  },
} satisfies Record<string, SxProps<Theme>>;
