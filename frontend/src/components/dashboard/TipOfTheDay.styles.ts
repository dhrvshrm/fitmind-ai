import type { CSSProperties } from 'react';
import { alpha, type SxProps, type Theme } from '@mui/material';

export const tipOfTheDayStyles = {
  motion: { marginBottom: 20, overflow: 'hidden' } satisfies CSSProperties,
  card: (theme: Theme) => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.75,
    px: { xs: 2, sm: 2.5 },
    py: 2,
    borderRadius: 3,
    border: '1px solid',
    borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.18),
    // A soft wash of the brand colour, fading out to the right.
    // Tint over an opaque paper base, so the page's doodles don't show through.
    background: `linear-gradient(110deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08)} 0%, ${alpha(theme.palette.primary.main, 0)} 70%), ${theme.palette.background.paper}`,
  }),
  iconWrap: (theme: Theme) => ({
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    color: theme.palette.primary.main,
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
  }),
  body: {
    flex: 1,
    minWidth: 0,
    pr: 3,
  },
  label: {
    display: 'block',
    lineHeight: 1.6,
    letterSpacing: 1,
    fontWeight: 700,
    color: 'primary.main',
  },
  text: {
    fontSize: { xs: 15, sm: 16 },
    lineHeight: 1.55,
  },
  close: {
    position: 'absolute',
    top: 8,
    right: 8,
    color: 'text.secondary',
  },
} satisfies Record<string, SxProps<Theme> | CSSProperties>;
