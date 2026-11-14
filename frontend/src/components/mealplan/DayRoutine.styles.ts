import { alpha, type SxProps, type Theme } from '@mui/material';
import type { RoutineKind } from '../../types/dietPlan';

const TONES: Record<RoutineKind, 'warning' | 'success' | 'primary' | 'info' | 'secondary'> = {
  wake: 'warning',
  workout: 'success',
  meal: 'primary',
  wind_down: 'info',
  sleep: 'secondary',
  fast_begins: 'info',
  extra: 'secondary',
};

export const dayRoutineStyles = {
  note: {
    mt: 0.5,
    fontWeight: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 2,
    mb: 2,
  },
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
  },
  item: {
    display: 'grid',
    // Phones drop the time column; times show inline instead.
    gridTemplateColumns: { xs: '36px minmax(0, 1fr)', sm: '52px 36px minmax(0, 1fr)' },
    columnGap: { xs: 1, sm: 1.5 },
  },
  time: {
    display: { xs: 'none', sm: 'block' },
    pt: 0.75,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    color: 'text.secondary',
  },
  inlineTime: {
    display: { xs: 'inline', sm: 'none' },
    mr: 1,
    color: 'text.secondary',
    fontVariantNumeric: 'tabular-nums',
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
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color,
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.2 : 0.12),
      };
    },
  icon: {
    fontSize: 20,
  },
  line: {
    width: '2px',
    flex: 1,
    minHeight: 16,
    my: 0.5,
    bgcolor: 'divider',
  },
  content: (last: boolean, isMeal: boolean): SxProps<Theme> => ({
    minWidth: 0,
    pb: last ? 0 : isMeal ? 2.5 : 2,
    pt: isMeal ? 0 : 0.75,
  }),
  step: {
    maxWidth: 560,
  },
};
