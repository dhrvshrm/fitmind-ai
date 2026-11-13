import type { CSSProperties } from 'react';
import { useTheme } from '@mui/material';
import { CHART_TOKENS, RADIUS } from '../theme';

/**
 * Recharts styling for the active color mode: brand marks, recessive grid
 * and ticks, and a tooltip that matches the app's surfaces. Every chart reads
 * its colors from here so light and dark mode stay consistent.
 */
export function useChartTheme() {
  const theme = useTheme();
  const tokens = CHART_TOKENS[theme.palette.mode];

  const tooltip: CSSProperties = {
    backgroundColor: tokens.tooltipBg,
    color: tokens.tooltipText,
    border: `1px solid ${tokens.tooltipBorder}`,
    borderRadius: RADIUS.sm,
    boxShadow: theme.shadows[3],
    fontSize: 12,
    fontFamily: 'inherit',
  };

  return {
    ...tokens,
    /** Brand color for single-series charts (neel). */
    brand: tokens.primary,
    brandMuted: tokens.primaryMuted,
    /** Older name for the brand color, kept so existing charts keep working. */
    purple: tokens.primary,
    purpleMuted: tokens.primaryMuted,
    /** Background behind marks, used for the 2px separation ring on dots. */
    surface: theme.palette.background.paper,
    tick: { fontSize: 12, fill: tokens.axis },
    tooltip,
    tooltipLabel: { color: tokens.tooltipText, fontWeight: 600 } satisfies CSSProperties,
    tooltipItem: { color: tokens.tooltipText } satisfies CSSProperties,
    cursor: { fill: tokens.grid },
  };
}
