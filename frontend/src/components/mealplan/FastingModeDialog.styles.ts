import { alpha, type SxProps, type Theme } from '@mui/material';

export const fastingModeDialogStyles = {
  content: {
    display: 'grid',
    gap: 1.5,
  },
  modes: {
    display: 'grid',
    gap: 1,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
  },
  // A selectable card per mode: its name and what it means for food.
  mode:
    (selected: boolean): SxProps<Theme> =>
    (theme) => ({
      display: 'grid',
      gap: 0.5,
      alignContent: 'start',
      textAlign: 'left',
      p: 1.5,
      borderRadius: 2,
      cursor: 'pointer',
      font: 'inherit',
      color: 'text.primary',
      border: '1px solid',
      borderColor: selected ? 'primary.main' : 'divider',
      bgcolor: selected
        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.07)
        : 'background.paper',
      transition: 'border-color 0.15s ease, background-color 0.15s ease',
      '&:hover': { borderColor: 'primary.main' },
      '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
    }),
  modeName: {
    fontWeight: 700,
  },
  dates: {
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 1.5,
    mt: 1,
  },
};
