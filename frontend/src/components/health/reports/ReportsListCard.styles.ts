import type { SxProps, Theme } from '@mui/material';

export const reportsListCardStyles = {
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1,
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.25,
    p: 1.25,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
  },
  icon: {
    color: 'primary.main',
    mt: '2px',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1,
    mt: 0.75,
  },
  buttons: {
    flexDirection: 'row',
    flexShrink: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
