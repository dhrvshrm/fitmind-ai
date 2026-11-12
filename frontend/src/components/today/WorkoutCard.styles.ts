import type { SxProps, Theme } from '@mui/material';

export const workoutCardStyles = {
  focus: {
    fontWeight: 700,
    lineHeight: 1.3,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
  },
  exercises: {
    color: 'text.secondary',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  actions: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 1,
    mt: 'auto',
    pt: 0.5,
  },
  primary: {
    flex: { sm: 1 },
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  },
} satisfies Record<string, SxProps<Theme>>;
