import { alpha, type SxProps, type Theme } from '@mui/material';
import type { RoutineKind } from '../../types/dietPlan';

const TONES: Record<RoutineKind, 'warning' | 'success' | 'primary' | 'info' | 'secondary'> = {
  wake: 'warning',
  workout: 'success',
  meal: 'primary',
  wind_down: 'info',
  sleep: 'secondary',
};

export const dayRoutineStyles = {
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
  },
  item: {
    display: 'grid',
    gridTemplateColumns: '48px 32px minmax(0, 1fr)',
    columnGap: 1.25,
  },
  time: {
    pt: 0.6,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    color: 'text.secondary',
  },
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  dot:
    (kind: RoutineKind): SxProps<Theme> =>
    (theme) => {
      const color = theme.palette[TONES[kind]].main;
      return {
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color,
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.2 : 0.12),
      };
    },
  icon: {
    fontSize: 18,
  },
  line: {
    width: '2px',
    flex: 1,
    minHeight: 16,
    my: 0.5,
    bgcolor: 'divider',
  },
  content: (last: boolean): SxProps<Theme> => ({
    pb: last ? 0 : 2,
    pt: 0.5,
    minWidth: 0,
  }),
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1,
  },
};
