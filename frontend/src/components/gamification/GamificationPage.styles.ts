import type { SxProps, Theme } from '@mui/material';

export const gamificationPageStyles = {
  title: {
    fontWeight: 700,
  },
  topGrid: {
    display: 'grid',
    gap: 3,
    gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
    mt: 3,
    alignItems: 'stretch',
  },
  badgeWallWrap: {
    mt: 3,
  },
  skeleton: {
    borderRadius: 3,
    height: 180,
    mt: 3,
  },
  errorAlert: {
    mt: 3,
  },
} satisfies Record<string, SxProps<Theme>>;
