import type { SxProps, Theme } from '@mui/material';

export const xpBarStyles = {
  root: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    mb: 0.5,
  },
  percentLabel: {
    fontWeight: 700,
    color: 'primary.main',
  },
  track: {
    height: 12,
    borderRadius: 6,
  },
} satisfies Record<string, SxProps<Theme>>;
