import type { SxProps, Theme } from '@mui/material';

export const sectionCardStyles = {
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 2,
    px: { xs: 2, sm: 2.5 },
    pt: { xs: 2, sm: 2.5 },
  },
  headerText: {
    minWidth: 0,
  },
  action: {
    flexShrink: 0,
  },
  body: {
    p: { xs: 2, sm: 2.5 },
    flexGrow: 1,
  },
  bodyAfterHeader: {
    px: { xs: 2, sm: 2.5 },
    pb: { xs: 2, sm: 2.5 },
    pt: 2,
    flexGrow: 1,
  },
  bodyFlush: {
    flexGrow: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
