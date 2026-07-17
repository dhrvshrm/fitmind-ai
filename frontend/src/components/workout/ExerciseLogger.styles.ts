import type { SxProps, Theme } from '@mui/material';

export const exerciseLoggerStyles = {
  card: (completed: boolean): SxProps<Theme> => ({
    p: 1.75,
    borderRadius: 2.5,
    borderColor: completed ? 'success.main' : 'divider',
    bgcolor: completed ? 'rgba(22, 163, 74, 0.05)' : 'background.paper',
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
    textDecoration: completed ? 'line-through' : 'none',
  }),
  doneChip: {
    fontWeight: 700,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 1,
    mt: 0.5,
  },
  setsReps: {
    fontWeight: 700,
    color: 'primary.main',
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
