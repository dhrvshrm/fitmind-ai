import type { SxProps, Theme } from '@mui/material';

export const calorieProgressBarStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    mb: 1,
  },
  title: {
    fontWeight: 700,
  },
  progressText: {
    fontWeight: 700,
    color: 'primary.main',
    fontVariantNumeric: 'tabular-nums',
  },
  bar: {
    height: 12,
    borderRadius: 6,
  },
  remaining: {
    mt: 1,
    display: 'block',
  },
} satisfies Record<string, SxProps<Theme>>;
