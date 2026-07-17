import type { SxProps, Theme } from '@mui/material';

export const workoutCompletionStyles = {
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    py: 0.75,
  },
  summaryName: {
    fontWeight: 600,
  },
  sectionLabel: {
    fontWeight: 700,
    mt: 2,
    mb: 1,
  },
  durationChip: {
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 1,
  },
  resultBox: {
    textAlign: 'center',
    py: 3,
  },
  xpText: {
    fontWeight: 800,
    color: 'primary.main',
    fontSize: '2.6rem',
    lineHeight: 1.1,
  },
  totalXp: {
    mt: 0.5,
  },
  levelUp: {
    fontWeight: 700,
    color: 'success.main',
    mt: 1.5,
  },
  badgeChip: {
    mt: 1.5,
    fontWeight: 700,
  },
} satisfies Record<string, SxProps<Theme>>;
