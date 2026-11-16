import { alpha, type SxProps, type Theme } from '@mui/material';

export const supplementRoutineStyles = {
  root: {
    mt: 2.5,
  },
  title: {
    display: 'block',
    fontWeight: 700,
    mb: 1,
  },
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1,
  },
  // A timeline step: clay rule on the left.
  group: ((theme) => ({
    pl: 1.5,
    borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
  })) satisfies SxProps<Theme>,
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.75,
  },
  clock: {
    fontSize: 16,
    color: 'text.secondary',
  },
  time: {
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  items: {
    mt: 0.25,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0.5,
    mt: 0.5,
  },
  tipIcon: {
    fontSize: 16,
    color: 'warning.main',
    mt: '1px',
  },
};
