import type { SxProps, Theme } from '@mui/material';

export const landingPageStyles = {
  // Transparent so the page's doodle texture shows between sections.
  root: {
    minHeight: '100svh',
    bgcolor: 'transparent',
    overflowX: 'clip',
  },
} satisfies Record<string, SxProps<Theme>>;
