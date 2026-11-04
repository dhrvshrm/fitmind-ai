import type { SxProps, Theme } from '@mui/material';

export const waterIntakeTrackerStyles = {
  glassesRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, auto)',
    justifyContent: 'center',
    gap: 0.75,
    mb: 2,
  },
  glassIcon: (filled: boolean): SxProps<Theme> => ({
    fontSize: 26,
    color: filled ? 'info.main' : 'action.disabled',
    transition: 'color 0.2s ease',
  }),
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  stepButton: {
    border: '1px solid',
    borderColor: 'divider',
  },
  count: {
    fontVariantNumeric: 'tabular-nums',
    minWidth: 44,
    textAlign: 'center',
  },
  goalText: {
    mt: 1.5,
    display: 'block',
    textAlign: 'center',
  },
};
