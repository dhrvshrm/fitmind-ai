import { alpha, type SxProps, type Theme } from '@mui/material';

export const fastingModesCardStyles = {
  list: {
    gap: 1,
  },
  // The active mode is tinted; upcoming ones stay plain.
  row:
    (active: boolean): SxProps<Theme> =>
    (theme) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 1.25,
      p: 1.25,
      borderRadius: 2,
      border: '1px solid',
      borderColor: active ? alpha(theme.palette.primary.main, 0.35) : 'divider',
      bgcolor: active ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06) : 'transparent',
    }),
  text: {
    flex: 1,
    minWidth: 0,
  },
};
