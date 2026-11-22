import type { SxProps, Theme } from '@mui/material';

export const exerciseDemoStyles = {
  root: {
    display: 'grid',
    gap: 1,
  },
  stage: {
    position: 'relative',
    // Most source photos are 3:2; portrait ones show whole over a blurred backdrop.
    aspectRatio: '3 / 2',
    borderRadius: 2,
    overflow: 'hidden',
    bgcolor: 'action.hover',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'blur(24px) brightness(0.55)',
    transform: 'scale(1.15)',
  },
  frame: (visible: boolean): SxProps<Theme> => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    opacity: visible ? 1 : 0,
    transition: 'opacity 250ms ease',
  }),
  toggle: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    bgcolor: 'background.paper',
    boxShadow: 1,
    '&:hover': { bgcolor: 'background.paper' },
  },
  video: {
    justifySelf: 'start',
  },
  note: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 0.75,
  },
  noteIcon: {
    fontSize: 16,
    mt: '2px',
    color: 'text.secondary',
  },
} satisfies Record<string, SxProps<Theme> | ((visible: boolean) => SxProps<Theme>)>;
