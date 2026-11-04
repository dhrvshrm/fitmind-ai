import type { SxProps, Theme } from '@mui/material';

export const workoutHistoryStyles = {
  monthLabel: {
    fontWeight: 600,
    textAlign: 'center',
    mb: 1,
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    gap: 0.5,
  },
  weekday: {
    textAlign: 'center',
    fontWeight: 600,
    color: 'text.secondary',
    pb: 0.5,
  },
  dayCell: (state: { completed: boolean; isToday: boolean; selected: boolean }): SxProps<Theme> => ({
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 1,
    cursor: 'pointer',
    fontWeight: state.completed ? 700 : 500,
    fontSize: '0.8rem',
    fontVariantNumeric: 'tabular-nums',
    color: state.completed ? 'primary.contrastText' : 'text.primary',
    bgcolor: state.completed ? 'primary.main' : 'transparent',
    border: 1,
    borderColor: state.selected
      ? 'primary.main'
      : state.isToday
        ? 'primary.light'
        : 'transparent',
    '&:hover': {
      bgcolor: state.completed ? 'primary.dark' : 'action.hover',
    },
  }),
  selectedInfo: {
    mt: 1.5,
    textAlign: 'center',
  },
  hint: {
    mt: 1.5,
    display: 'block',
    textAlign: 'center',
  },
};
