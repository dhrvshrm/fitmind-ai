import { alpha, type SxProps, type Theme } from '@mui/material';

export const exerciseLoggerStyles = {
  card:
    (completed: boolean): SxProps<Theme> =>
    (theme) => ({
      p: 1.75,
      borderColor: completed ? 'success.main' : 'divider',
      bgcolor: completed ? alpha(theme.palette.success.main, 0.06) : 'background.paper',
      transition: 'border-color 0.2s ease, background-color 0.2s ease',
    }),
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
  },
  name: (completed: boolean): SxProps<Theme> => ({
    fontWeight: 600,
    minWidth: 0,
    textDecoration: completed ? 'line-through' : 'none',
  }),
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 1,
    mt: 0.5,
  },
  setsReps: {
    fontWeight: 600,
    color: 'primary.main',
    fontVariantNumeric: 'tabular-nums',
  },
  setsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0.5,
    mt: 1,
  },
  setCheck: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  setLabel: {
    mt: -0.75,
  },
};
