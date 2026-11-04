import type { SxProps, Theme } from '@mui/material';

export const streakDisplayStyles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 1.5,
  },
  stat: {
    textAlign: 'center',
    p: 2,
    borderRadius: 1,
    bgcolor: 'action.hover',
  },
  icon: (active: boolean): SxProps<Theme> => ({
    fontSize: 28,
    color: active ? 'warning.main' : 'text.disabled',
  }),
  value: {
    fontWeight: 700,
    lineHeight: 1.1,
    mt: 0.5,
    fontVariantNumeric: 'tabular-nums',
  },
  label: {
    display: 'block',
    mt: 0.25,
  },
};
