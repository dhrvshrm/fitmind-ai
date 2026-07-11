import type { CSSProperties } from 'react';
import type { SxProps, Theme } from '@mui/material';

export const recoveryHistoryStyles = {
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
    height: 260,
  },
  empty: {
    py: 6,
    textAlign: 'center',
  },
} satisfies Record<string, SxProps<Theme>>;

/**
 * Chart tokens (validated against the light surface): brand purple line,
 * recessive grid/ticks in muted ink, theme-consistent tooltip.
 */
export const recoveryChartTheme = {
  line: '#aa3bff',
  grid: 'rgba(28, 21, 48, 0.08)',
  tick: { fontSize: 12, fill: '#6b6484' },
  tooltip: {
    borderRadius: 10,
    border: '1px solid rgba(28, 21, 48, 0.08)',
    boxShadow: '0px 6px 16px rgba(76, 29, 149, 0.09)',
    fontSize: 12,
    fontFamily: 'inherit',
  } satisfies CSSProperties,
} as const;
