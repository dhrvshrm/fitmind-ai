import type { SxProps, Theme } from '@mui/material';

export const gamificationPageStyles = {
  topGrid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '7fr 5fr' },
    alignItems: 'stretch',
  },
  badgeWallWrap: {
    mt: 2,
  },
  skeletonTop: {
    height: 200,
  },
  skeletonBadges: {
    height: 240,
    mt: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
