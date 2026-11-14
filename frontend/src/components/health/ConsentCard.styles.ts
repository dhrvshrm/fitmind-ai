import { alpha, type SxProps, type Theme } from '@mui/material';
import { FONTS, RADIUS } from '../../theme';

export const consentCardStyles = {
  // A notebook page: a clay margin rule down the left.
  card: ((theme) => ({
    position: 'relative',
    p: { xs: 3, sm: 4 },
    pl: { xs: 4.5, sm: 7 },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: { xs: 20, sm: 32 },
      borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
    },
  })) satisfies SxProps<Theme>,
  eyebrow: {
    fontFamily: FONTS.hand,
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'secondary.main',
    lineHeight: 1,
    transform: 'rotate(-2deg)',
    display: 'inline-block',
    mb: 1,
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  intro: {
    mt: 1,
    maxWidth: 620,
  },
  points: {
    listStyle: 'none',
    m: 0,
    mt: 3,
    p: 0,
    display: 'grid',
    gap: 2.5,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
  },
  point: {
    display: 'flex',
    gap: 1.5,
    alignItems: 'flex-start',
  },
  pointIcon: ((theme) => ({
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    width: 34,
    height: 34,
    borderRadius: `${RADIUS.sm}px`,
    color: 'primary.main',
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.08),
  })) satisfies SxProps<Theme>,
  pointTitle: {
    fontWeight: 700,
    mb: 0.25,
  },
  agree: {
    mt: 3.5,
  },
};
