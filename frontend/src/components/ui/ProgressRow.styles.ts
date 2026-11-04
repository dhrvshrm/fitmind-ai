import type { SxProps, Theme } from '@mui/material';

export const progressRowStyles = {
  labels: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 1,
    mb: 0.75,
  },
  label: {
    fontWeight: 500,
  },
  numbers: {
    fontVariantNumeric: 'tabular-nums',
  },
  bar:
    (color?: string): SxProps<Theme> =>
    (theme) => ({
      '& .MuiLinearProgress-bar': {
        backgroundColor: color ?? theme.palette.primary.main,
      },
    }),
};
