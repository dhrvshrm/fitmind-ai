import type { SxProps, Theme } from '@mui/material';

export const challengesCardStyles = {
  list: {
    gap: 1.5,
  },
  row: {
    p: 1.5,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 1,
  },
  rowTitle: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  bars: {
    gap: 1,
  },
  barLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    mb: 0.5,
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
