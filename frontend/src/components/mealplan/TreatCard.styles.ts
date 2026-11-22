import type { SxProps, Theme } from '@mui/material';

export const treatCardStyles = {
  cravings: {
    display: 'grid',
    gap: 1,
    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
  },
  craving: {
    justifyContent: 'flex-start',
    textAlign: 'left',
    gap: 0.5,
    py: 1.25,
    px: 1.5,
    borderRadius: 2,
    minWidth: 0,
    lineHeight: 1.25,
    borderColor: 'divider',
  } satisfies SxProps<Theme>,
};
