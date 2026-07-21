import type { SxProps, Theme } from '@mui/material';

export const chatContainerStyles = {
  root: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    px: { xs: 1.5, sm: 2 },
    py: 2,
  },
  empty: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    px: 2,
  },
  emptyIcon: {
    fontSize: 40,
    color: 'primary.main',
    mb: 1,
  },
  emptyTitle: {
    fontWeight: 700,
  },
} satisfies Record<string, SxProps<Theme>>;
