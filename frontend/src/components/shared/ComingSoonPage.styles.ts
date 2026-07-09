import type { SxProps, Theme } from '@mui/material';

export const comingSoonStyles = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  card: {
    p: { xs: 3, sm: 5 },
    maxWidth: 440,
    textAlign: 'center',
    borderRadius: 3,
  },
  icon: {
    fontSize: 48,
    color: 'primary.main',
    mb: 1,
  },
  title: {
    fontWeight: 700,
  },
  badge: {
    mt: 2,
    fontWeight: 600,
  },
} satisfies Record<string, SxProps<Theme>>;
