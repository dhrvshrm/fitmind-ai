import type { SxProps, Theme } from '@mui/material';

export const passwordStrengthStyles = {
  root: {
    mt: 1,
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
  labels: {
    mt: 0.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelLabel: {
    fontWeight: 600,
  },
} satisfies Record<string, SxProps<Theme>>;
