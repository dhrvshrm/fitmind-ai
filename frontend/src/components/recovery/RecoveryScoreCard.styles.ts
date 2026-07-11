import type { SxProps, Theme } from '@mui/material';

export const recoveryScoreCardStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  title: {
    fontWeight: 700,
    mb: 1.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  score: (color: string): SxProps<Theme> => ({
    fontWeight: 800,
    lineHeight: 1,
    fontSize: { xs: '3rem', sm: '3.75rem' },
    color,
  }),
  outOf: {
    color: 'text.secondary',
    fontWeight: 600,
  },
  recommendation: (color: string): SxProps<Theme> => ({
    fontWeight: 700,
    mt: 1.5,
    color,
  }),
  explanation: {
    mt: 0.5,
  },
  skeletonScore: {
    fontSize: '3.75rem',
    maxWidth: 160,
  },
};
