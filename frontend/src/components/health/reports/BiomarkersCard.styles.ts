import type { SxProps, Theme } from '@mui/material';

export const biomarkersCardStyles = {
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1.25,
  },
  row: {
    p: 1.5,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontWeight: 700,
    lineHeight: 1.3,
  },
  valueLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
    my: 0.25,
  },
  value: {
    fontSize: '1.4rem',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  spark: {
    width: { xs: 96, sm: 160 },
    height: 64,
    flexShrink: 0,
  },
  toggle: {
    mt: 0.5,
    ml: -1,
  },
  chevron: (open: boolean) => ({
    transform: open ? 'rotate(180deg)' : 'none',
    transition: 'transform 150ms ease',
  }),
  about: {
    mt: 0.5,
    mb: 1,
  },
  points: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 0.5,
  },
  point: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto auto auto',
    alignItems: 'center',
    gap: 1,
  },
  pointDate: {
    color: 'text.secondary',
  },
  pointValue: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  source: {
    mt: 1,
  },
  uses: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0.75,
    mt: 2,
  },
  usesIcon: {
    fontSize: 16,
    color: 'text.secondary',
    mt: '1px',
  },
} satisfies Record<string, SxProps<Theme> | ((open: boolean) => SxProps<Theme>)>;
