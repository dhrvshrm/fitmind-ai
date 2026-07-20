import type { SxProps, Theme } from '@mui/material';

export const streakDisplayStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    height: '100%',
  },
  title: {
    fontWeight: 700,
    mb: 2,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 2,
  },
  stat: {
    textAlign: 'center',
    p: 2,
    borderRadius: 2.5,
    bgcolor: 'action.hover',
  },
  icon: (active: boolean): SxProps<Theme> => ({
    fontSize: 32,
    color: active ? 'warning.main' : 'action.disabled',
  }),
  value: {
    fontWeight: 800,
    lineHeight: 1.1,
    mt: 0.5,
  },
  label: {
    mt: 0.25,
  },
};
