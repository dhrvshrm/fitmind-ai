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
    fontWeight: 700,
    color: 'primary.main',
    fontSize: '2.5rem',
    fontVariantNumeric: 'tabular-nums',
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
  records: {
    mt: 2,
    p: 1.5,
    borderRadius: 2,
    bgcolor: 'action.hover',
    textAlign: 'left',
    display: 'grid',
    gap: 0.5,
  },
  recordsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.75,
    color: 'warning.main',
    mb: 0.25,
  },
} satisfies Record<string, SxProps<Theme>>;
