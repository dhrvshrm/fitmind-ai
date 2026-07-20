import type { SxProps, Theme } from '@mui/material';

export const waterIntakeTrackerStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    height: '100%',
    textAlign: 'center',
  },
  title: {
    fontWeight: 700,
    mb: 1.5,
  },
  glassesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 0.5,
    mb: 1.5,
  },
  glassIcon: (filled: boolean): SxProps<Theme> => ({
    fontSize: 28,
    color: filled ? 'info.main' : 'action.disabled',
    transition: 'color 0.2s ease',
  }),
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  count: {
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 44,
  },
  goalText: {
    mt: 1,
    display: 'block',
  },
  goalReached: {
    mt: 1,
    fontWeight: 700,
    color: 'info.main',
  },
};
