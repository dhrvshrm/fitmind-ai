import type { SxProps, Theme } from '@mui/material';

export const xpBarStyles = {
  root: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 1,
    mb: 0.75,
  },
  percentLabel: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  track: {
    height: 10,
  },
} satisfies Record<string, SxProps<Theme>>;
