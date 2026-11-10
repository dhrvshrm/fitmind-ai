import type { SxProps, Theme } from '@mui/material';

export const muscleMapStyles = {
  models: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: { xs: 2, sm: 4 },
  },
  rows: {
    gap: 1,
    mt: 2.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  rowLabel: {
    fontWeight: 600,
    minWidth: 92,
    flexShrink: 0,
  },
  swatch: (color: string): SxProps<Theme> => ({
    width: 12,
    height: 12,
    borderRadius: '3px',
    bgcolor: color,
    flexShrink: 0,
    alignSelf: 'center',
  }),
  hint: {
    mt: 1.5,
  },
};
