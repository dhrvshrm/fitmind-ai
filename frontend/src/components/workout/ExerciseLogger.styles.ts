import { alpha, type SxProps, type Theme } from '@mui/material';
import type { TargetAction } from '../../types/workout';

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
    minWidth: 0,
  },
  effort: {
    mt: 0.5,
  },
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
  // Today's target: tinted by what it asks for (push on, hold, or ease off).
  target:
    (action: TargetAction): SxProps<Theme> =>
    (theme) => {
      const color =
        action === 'add_weight' || action === 'harder_variation' || action === 'add_set'
          ? theme.palette.success.main
          : action === 'reduce' || action === 'deload'
            ? theme.palette.warning.main
            : theme.palette.primary.main;
      return {
        mt: 1.25,
        p: 1.25,
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha(color, 0.35),
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.12 : 0.06),
        '& svg': { color },
      };
    },
  targetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
    mb: 0.25,
  },
  targetChip: {
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  setTable: {
    display: 'grid',
    gap: 0.75,
    mt: 1.25,
  },
  setRow:
    (done: boolean): SxProps<Theme> =>
    (theme) => ({
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
      px: 1,
      py: 0.25,
      borderRadius: 1.5,
      bgcolor: done ? alpha(theme.palette.success.main, 0.08) : 'transparent',
      transition: 'background-color 0.2s ease',
    }),
  setIndex: {
    width: 40,
    flexShrink: 0,
  },
  numberField: {
    flex: 1,
    minWidth: 0,
    maxWidth: 140,
    '& input': { fontVariantNumeric: 'tabular-nums' },
  },
  feltRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 0.75,
    mt: 1.25,
  },
};
