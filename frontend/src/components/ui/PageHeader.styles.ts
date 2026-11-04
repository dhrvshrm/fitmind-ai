import type { SxProps, Theme } from '@mui/material';

export const pageHeaderStyles = {
  root: {
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: { xs: 'flex-start', sm: 'flex-end' },
    justifyContent: 'space-between',
    gap: 2,
    mb: 3,
  },
  text: {
    minWidth: 0,
  },
  subtitle: {
    mt: 0.5,
  },
  actions: {
    display: 'flex',
    gap: 1,
    flexWrap: 'wrap',
  },
} satisfies Record<string, SxProps<Theme>>;
