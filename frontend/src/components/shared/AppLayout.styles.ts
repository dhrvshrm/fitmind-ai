import type { SxProps, Theme } from '@mui/material';

/** Widest the page content gets; keeps lines and grids readable on large screens. */
const CONTENT_MAX_WIDTH = 1280;

export const appLayoutStyles = {
  root: {
    display: 'flex',
    minHeight: '100svh',
    // Transparent so the page's doodle texture (set on body by the theme) shows through.
    bgcolor: 'transparent',
  },
  main: {
    flexGrow: 1,
    minWidth: 0,
  },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    mx: 'auto',
    px: { xs: 2, sm: 3, lg: 4 },
    py: { xs: 2.5, sm: 3.5 },
  },
} satisfies Record<string, SxProps<Theme>>;
