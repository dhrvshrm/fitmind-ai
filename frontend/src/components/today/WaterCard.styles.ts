import type { SxProps, Theme } from '@mui/material';

export const waterCardStyles = {
  amount: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 1,
  },
  value: {
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  bar: {
    height: 10,
    borderRadius: 999,
    '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: 'info.main' },
  },
  buttons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 1,
    mt: 'auto',
  },
  done: {
    color: 'success.main',
    fontWeight: 600,
  },
} satisfies Record<string, SxProps<Theme>>;
