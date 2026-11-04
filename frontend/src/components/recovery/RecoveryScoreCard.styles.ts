import type { SxProps, Theme } from '@mui/material';
import { FONTS } from '../../theme';

export const recoveryScoreCardStyles = {
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  score: (color: string): SxProps<Theme> => ({
    fontFamily: FONTS.display,
    fontWeight: 700,
    lineHeight: 1,
    fontSize: { xs: '3rem', sm: '3.5rem' },
    fontVariantNumeric: 'tabular-nums',
    color,
  }),
  outOf: {
    color: 'text.secondary',
    fontWeight: 600,
  },
  recommendation: (color: string): SxProps<Theme> => ({
    mt: 1.5,
    color,
  }),
  explanation: {
    mt: 0.5,
  },
  skeletonScore: {
    fontSize: '3.5rem',
    maxWidth: 160,
  },
  skeletonLine: {
    maxWidth: 240,
  },
};
