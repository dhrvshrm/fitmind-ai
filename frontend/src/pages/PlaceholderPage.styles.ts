import type { SxProps, Theme } from '@mui/material';

export const placeholderPageStyles = {
  root: {
    minHeight: '100svh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 2,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 3,
  },
  content: {
    p: 4,
  },
  stack: {
    textAlign: 'center',
  },
  brand: {
    fontWeight: 700,
  },
  title: {
    fontWeight: 700,
  },
} satisfies Record<string, SxProps<Theme>>;
