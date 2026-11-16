import type { SxProps, Theme } from '@mui/material';

export const bodyScanCardStyles = {
  content: {
    display: 'grid',
    gap: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: -1,
  },
  stats: {
    m: 0,
    display: 'grid',
    gap: 1,
    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
  },
  stat: {
    p: 1.25,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    m: 0,
    fontSize: '1.3rem',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  change: {
    color: 'text.secondary',
    fontVariantNumeric: 'tabular-nums',
  },
  findingsTitle: {
    fontWeight: 700,
    mb: 1,
  },
  findings: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1,
  },
  finding: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1,
  },
  findingIcon: {
    fontSize: 18,
    color: 'primary.main',
    mt: '2px',
  },
  history: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 0.5,
  },
  historyRow: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 1.5,
  },
  historyValues: {
    fontVariantNumeric: 'tabular-nums',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0.75,
  },
  disclaimerIcon: {
    fontSize: 16,
    color: 'text.secondary',
    mt: '1px',
  },
} satisfies Record<string, SxProps<Theme>>;
