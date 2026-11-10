import { alpha, type SxProps, type Theme } from '@mui/material';
import { hoverLift } from '../ui/interactive.styles';
import { getWorkoutToneColor, type WorkoutTypeTone } from '../../constants/workout';

export const weeklyPlanViewStyles = {
  grid: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: {
      xs: 'repeat(2, minmax(0, 1fr))',
      sm: 'repeat(4, minmax(0, 1fr))',
      md: 'repeat(7, minmax(0, 1fr))',
    },
  },
  dayCard:
    (tone: WorkoutTypeTone, isToday: boolean): SxProps<Theme> =>
    (theme) => ({
      p: 1.5,
      minWidth: 0,
      cursor: 'pointer',
      textAlign: 'center',
      borderTop: 3,
      borderTopColor: getWorkoutToneColor(theme.palette, tone),
      outline: isToday ? 2 : 0,
      outlineColor: theme.palette.primary.main,
      outlineStyle: isToday ? 'solid' : 'none',
      outlineOffset: 1,
      height: '100%',
      ...hoverLift,
      '&:hover': {
        bgcolor: 'action.hover',
      },
      '&:focus-visible': {
        outline: 2,
        outlineStyle: 'solid',
        outlineColor: theme.palette.primary.main,
      },
    }),
  dayName: {
    fontWeight: 600,
  },
  typeIcon:
    (tone: WorkoutTypeTone): SxProps<Theme> =>
    (theme) => ({
      color: getWorkoutToneColor(theme.palette, tone),
      my: 0.5,
    }),
  typeLabel:
    (tone: WorkoutTypeTone): SxProps<Theme> =>
    (theme) => ({
      fontWeight: 600,
      color: getWorkoutToneColor(theme.palette, tone),
      display: 'block',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
  exerciseCount: {
    display: 'block',
    mt: 0.25,
  },
  dialogTitle: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 2,
  },
  dialogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  typeChip:
    (tone: WorkoutTypeTone): SxProps<Theme> =>
    (theme) => {
      const color = getWorkoutToneColor(theme.palette, tone);
      return {
        color,
        bgcolor: alpha(color, theme.palette.mode === 'light' ? 0.1 : 0.16),
      };
    },
  dialogList: {
    display: 'grid',
    gap: 1.5,
  },
  footer: {
    display: 'grid',
    gap: 1,
    mt: 2,
  },
};
