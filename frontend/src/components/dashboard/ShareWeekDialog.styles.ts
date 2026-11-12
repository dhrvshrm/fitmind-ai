import type { SxProps, Theme } from '@mui/material';

export const shareWeekDialogStyles = {
  subtitle: {
    mb: 2,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1.2fr) minmax(0, 1fr)' },
    gap: 3,
    alignItems: 'start',
  },
  previewWrap: {
    width: '100%',
    maxWidth: 360,
    mx: 'auto',
  },
  preview: {
    width: '100%',
    display: 'block',
    borderRadius: 2,
    boxShadow: 3,
  },
  previewSkeleton: {
    width: '100%',
    aspectRatio: '4 / 5',
    height: 'auto',
  },
  options: {
    gap: 0.25,
  },
  healthLabel: {
    mt: 1.5,
  },
  actions: {
    px: 3,
    pb: 2,
    flexWrap: 'wrap',
  },
} satisfies Record<string, SxProps<Theme>>;
