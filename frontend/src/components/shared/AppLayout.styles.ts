import type { SxProps, Theme } from '@mui/material';

export const appLayoutStyles = {
  root: {
    display: 'flex',
    minHeight: '100svh',
    // Subtle "aurora" wash: a violet glow top-right, a teal glow bottom-left,
    // over the base lavender-grey — adds depth without distracting from content.
    background:
      'radial-gradient(1000px 620px at 100% -6%, rgba(170, 59, 255, 0.08), transparent 55%),' +
      'radial-gradient(820px 620px at -6% 106%, rgba(18, 184, 166, 0.06), transparent 55%),' +
      '#f6f5fb',
  },
  main: {
    flexGrow: 1,
    p: { xs: 2, sm: 3 },
    minWidth: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
