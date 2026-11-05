import type { SxProps, Theme } from '@mui/material';

export const stepRoutineStyles = {
  timeRow: {
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
