import type { SxProps, Theme } from '@mui/material';

export const exerciseCardStyles = {
  card: (done: boolean): SxProps<Theme> => ({
    p: 1.75,
    borderRadius: 2.5,
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    opacity: done ? 0.65 : 1,
    transition: 'opacity 0.15s ease',
  }),
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: (done: boolean): SxProps<Theme> => ({
    fontWeight: 600,
    textDecoration: done ? 'line-through' : 'none',
  }),
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 1,
    mt: 0.75,
  },
  setsReps: {
    fontWeight: 700,
    color: 'primary.main',
  },
};
