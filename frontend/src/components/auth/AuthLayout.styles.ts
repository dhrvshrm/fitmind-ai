import type { SxProps, Theme } from '@mui/material';

export const authLayoutStyles = {
  root: {
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 2,
    background: 'linear-gradient(160deg, #f7f6fb 0%, #efe6fb 100%)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 3,
  },
  content: {
    p: { xs: 3, sm: 4 },
  },
  header: {
    mb: 3,
    textAlign: 'center',
  },
  brand: {
    fontWeight: 700,
  },
  title: {
    fontWeight: 700,
  },
  footer: {
    mt: 3,
    textAlign: 'center',
  },
} satisfies Record<string, SxProps<Theme>>;
