import { alpha, type SxProps, type Theme } from '@mui/material';
import { FONTS } from '../../theme';
import { squiggleUnderline } from '../ui/squiggle.styles';

export const landingNavStyles = {
  // Sticky wrapper; the bar itself floats inside it as a pill.
  root: ((theme) => ({
    position: 'sticky',
    top: 0,
    zIndex: theme.zIndex.appBar,
    px: { xs: 1.5, sm: 3 },
    pt: { xs: 1.5, md: 2 },
    pointerEvents: 'none',
  })) satisfies SxProps<Theme>,
  pill:
    (compact: boolean): SxProps<Theme> =>
    (theme) => ({
      pointerEvents: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      maxWidth: compact ? 1040 : 1180,
      mx: 'auto',
      height: compact ? 56 : 64,
      pl: { xs: 2, sm: 2.5 },
      pr: { xs: 1, sm: 1.25 },
      borderRadius: '999px',
      bgcolor: alpha(theme.palette.background.paper, compact ? 0.9 : 0.72),
      backdropFilter: 'saturate(150%) blur(14px)',
      border: `1px solid ${compact ? theme.palette.divider : 'transparent'}`,
      boxShadow: compact ? `0 10px 30px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.08)}` : 'none',
      transition: 'all 280ms cubic-bezier(0.22, 1, 0.36, 1)',
      '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
    }),
  mark: {
    display: 'block',
    borderRadius: '9px',
    flexShrink: 0,
  },
  links: {
    display: { xs: 'none', md: 'flex' },
    flexDirection: 'row',
    gap: 3.5,
    mx: 'auto',
  },
  link:
    (active: boolean): SxProps<Theme> => ({
      fontWeight: 600,
      fontSize: '0.95rem',
      py: 0.5,
      transition: 'color 150ms ease',
      '&:hover': { color: 'text.primary' },
      ...(squiggleUnderline(active) as object),
    }),
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.75,
    ml: { xs: 'auto', md: 0 },
  },
  login: {
    display: { xs: 'none', sm: 'inline-flex' },
  },
  start: {
    px: 2.25,
    '& .MuiButton-endIcon': { transition: 'transform 200ms ease' },
    '&:hover .MuiButton-endIcon': { transform: 'translateX(3px)' },
  },
  menuButton: {
    display: { xs: 'inline-flex', md: 'none' },
  },
  drawer: {
    p: 2.5,
    pb: 3,
    borderRadius: '0 0 24px 24px',
  },
  drawerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 2,
  },
  drawerLinks: {
    gap: 0.5,
    mb: 2.5,
  },
  // Numbered like a notebook's contents page.
  drawerLink: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 1.5,
    py: 1.25,
    fontFamily: FONTS.display,
    fontSize: '1.5rem',
    fontWeight: 600,
    borderBottom: '1px dashed',
    borderColor: 'divider',
  },
  drawerIndex: {
    fontFamily: FONTS.body,
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'secondary.main',
  },
  drawerActions: {
    gap: 1,
  },
};
