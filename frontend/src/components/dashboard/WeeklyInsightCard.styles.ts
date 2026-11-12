import type { SxProps, Theme } from '@mui/material';

export const weeklyInsightCardStyles = {
  stack: {
    gap: 1.5,
  },
  headline: {
    fontWeight: 700,
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.25,
  },
  icon: {
    mt: 0.5,
  },
  label: {
    display: 'block',
    lineHeight: 1.6,
  },
} satisfies Record<string, SxProps<Theme>>;
