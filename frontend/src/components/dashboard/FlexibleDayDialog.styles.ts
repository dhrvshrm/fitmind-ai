import type { SxProps, Theme } from '@mui/material';

export const flexibleDayDialogStyles = {
  fields: {
    gap: 2.5,
    pt: 2,
  },
  sliderLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  extraValue: {
    fontWeight: 600,
    color: 'primary.main',
  },
  actions: {
    px: 3,
    pb: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
