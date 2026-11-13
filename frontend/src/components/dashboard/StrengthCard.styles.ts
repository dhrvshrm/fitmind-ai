import type { SxProps, Theme } from '@mui/material';

export const strengthCardStyles = {
  grid: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
  },
  lift: {
    p: 1.5,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    display: 'grid',
    gap: 0.5,
  },
  liftHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
  },
  name: {
    fontWeight: 600,
    minWidth: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  value: {
    fontVariantNumeric: 'tabular-nums',
  },
  spark: {
    height: 48,
  },
} satisfies Record<string, SxProps<Theme>>;
