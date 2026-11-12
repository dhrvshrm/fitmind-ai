import type { SxProps, Theme } from '@mui/material';

export const progressPhotosCardStyles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
    gap: 1.5,
  },
  tile: {
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden',
    bgcolor: 'action.hover',
    aspectRatio: '3 / 4',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: 1,
    py: 0.25,
    bgcolor: 'rgba(0, 0, 0, 0.45)',
  },
  date: {
    color: 'common.white',
    fontWeight: 600,
  },
  delete: {
    color: 'common.white',
  },
} satisfies Record<string, SxProps<Theme>>;
