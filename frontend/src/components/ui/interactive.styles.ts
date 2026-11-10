import type { SxProps, Theme } from '@mui/material';

/**
 * A gentle lift for clickable cards on devices that can hover. Spread it
 * into a card's styles; it switches off for "reduce motion".
 */
export const hoverLift = {
  transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 150ms ease, background-color 150ms ease',
  '@media (hover: hover)': {
    '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': { transform: 'none' },
  },
} satisfies SxProps<Theme>;
