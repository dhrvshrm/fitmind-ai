import type { CSSProperties } from 'react';
import type { SxProps, Theme } from '@mui/material';

export const moodHistoryStyles = {
  stack: {
    display: 'grid',
    gap: 3,
  },
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  title: {
    fontWeight: 700,
    mb: 2,
  },
  chartWrap: {
    width: '100%',
    height: 240,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    mt: 1.5,
  },
  legendDot: (color: string): SxProps<Theme> => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    bgcolor: color,
    display: 'inline-block',
    mr: 0.75,
  }),
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empty: {
    py: 5,
    textAlign: 'center',
  },
  listEmoji: {
    fontSize: 24,
    lineHeight: 1,
  },
  listMood: {
    textTransform: 'capitalize',
  },
  energyChip: {
    fontWeight: 700,
  },
} as const;

/** Chart tokens: brand purple energy line, recessive grid/ticks, themed tooltip. */
export const moodChartTheme = {
  line: '#aa3bff',
  grid: 'rgba(28, 21, 48, 0.08)',
  tick: { fontSize: 12, fill: '#6b6484' },
  dotStroke: '#ffffff',
  tooltip: {
    borderRadius: 10,
    border: '1px solid rgba(28, 21, 48, 0.08)',
    boxShadow: '0px 6px 16px rgba(76, 29, 149, 0.09)',
    fontSize: 12,
    fontFamily: 'inherit',
  } satisfies CSSProperties,
} as const;
