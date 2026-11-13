import type { SxProps, Theme } from '@mui/material';
import { FONTS } from '../../theme';

export const wordmarkStyles = {
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 1.1,
  },
  // Tilts a little on hover, like a stamp being pressed.
  mark:
    (size: number): SxProps<Theme> => ({
      display: 'block',
      flexShrink: 0,
      borderRadius: `${Math.round(size * 0.28)}px`,
      transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      'a:hover &, button:hover &': { transform: 'rotate(-8deg) scale(1.05)' },
      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    }),
  name:
    (size: number): SxProps<Theme> => ({
      fontFamily: FONTS.display,
      fontWeight: 700,
      fontSize: `${Math.round(size * 0.62)}px`,
      letterSpacing: '-0.02em',
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }),
  ai: {
    fontStyle: 'italic',
    fontWeight: 600,
    color: 'primary.main',
    ml: '0.18em',
  },
};
