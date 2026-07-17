import type { SxProps, Theme } from '@mui/material';

export const weeklyPlanViewStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  title: {
    fontWeight: 700,
    mb: 2,
  },
  grid: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: {
      xs: 'repeat(2, 1fr)',
      sm: 'repeat(4, 1fr)',
      md: 'repeat(7, 1fr)',
    },
  },
  dayCard: (color: string, isToday: boolean): SxProps<Theme> => ({
    p: 1.5,
    borderRadius: 2.5,
    cursor: 'pointer',
    textAlign: 'center',
    borderTop: 3,
    borderTopColor: color,
    outline: isToday ? 2 : 0,
    outlineColor: 'primary.main',
    outlineStyle: isToday ? 'solid' : 'none',
    outlineOffset: 1,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: 4,
    },
  }),
  dayName: {
    fontWeight: 700,
  },
  typeIcon: (color: string): SxProps<Theme> => ({
    color,
    my: 0.5,
  }),
  typeLabel: (color: string): SxProps<Theme> => ({
    fontWeight: 600,
    color,
    display: 'block',
  }),
  exerciseCount: {
    display: 'block',
    mt: 0.25,
  },
  dialogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  typeChip: (color: string): SxProps<Theme> => ({
    bgcolor: color,
    color: '#fff',
  }),
  dialogList: {
    display: 'grid',
    gap: 1.5,
    mt: 1,
  },
  dialogRest: {
    py: 3,
    textAlign: 'center',
  },
};
