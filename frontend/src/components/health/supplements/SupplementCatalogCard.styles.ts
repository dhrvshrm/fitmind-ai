import { alpha, type SxProps, type Theme } from '@mui/material';
import { RADIUS } from '../../../theme';

export const supplementCatalogCardStyles = {
  // "We sell nothing, and never list steroids": the first thing on the card.
  promise: ((theme) => ({
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 1,
    p: 1.5,
    mb: 2,
    borderRadius: `${RADIUS.md}px`,
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06),
  })) satisfies SxProps<Theme>,
  promiseIcon: {
    color: 'primary.main',
    mt: '2px',
  },
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1.25,
  },
  item:
    (relevant: boolean): SxProps<Theme> =>
    (theme) => ({
      p: 1.75,
      borderRadius: `${RADIUS.md}px`,
      border: `1px ${relevant ? 'solid' : 'dashed'} ${relevant ? alpha(theme.palette.secondary.main, 0.5) : theme.palette.divider}`,
    }),
  itemHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 1.5,
  },
  itemText: {
    minWidth: 0,
  },
  trackButton: {
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 0.75,
    mb: 0.5,
  },
  evidence: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0.75,
    mt: 1.25,
  },
  why: {
    mt: 1.25,
    display: 'grid',
    gap: 0.5,
  },
  flags: {
    mt: 1.25,
    gap: 0.75,
  },
  flag: {
    py: 0,
  },
  toggle: {
    mt: 0.75,
    ml: -1,
  },
  details: {
    display: 'grid',
    gap: 1.25,
    mt: 0.5,
  },
  detailTitle: {
    display: 'block',
    fontWeight: 700,
    mb: 0.25,
  },
  detailList: {
    m: 0,
    pl: 2.5,
    display: 'grid',
    gap: 0.25,
  },
  reviewed: {
    mt: 2,
  },
};
