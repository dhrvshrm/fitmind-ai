import type { CSSProperties } from 'react';
import type { SxProps, Theme } from '@mui/material';

export const macroPieChartStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    height: '100%',
  },
  title: {
    fontWeight: 700,
    mb: 1,
  },
  chartWrap: {
    width: '100%',
    height: 200,
  },
  empty: {
    py: 5,
    textAlign: 'center',
  },
  legend: {
    mt: 1,
    display: 'grid',
    gap: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  legendDot: (color: string): SxProps<Theme> => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    bgcolor: color,
    flexShrink: 0,
  }),
};

/** Recharts bits that take plain CSS/props rather than sx. */
export const macroChartTheme = {
  /** 2px surface gap between slices. */
  sliceStroke: '#ffffff',
  sliceStrokeWidth: 2,
  tooltip: {
    borderRadius: 10,
    border: '1px solid rgba(28, 21, 48, 0.08)',
    boxShadow: '0px 6px 16px rgba(76, 29, 149, 0.09)',
    fontSize: 12,
    fontFamily: 'inherit',
  } satisfies CSSProperties,
} as const;
