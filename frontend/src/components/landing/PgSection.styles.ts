import { alpha, type SxProps, type Theme } from '@mui/material';
import { FONTS } from '../../theme';
import { LANDING_MAX_WIDTH } from './layout';

/** Numbers on the chit, like the receipt in the day timeline. */
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
/** Ruled lines on the chit; each row sits on one. */
const LINE = 34;

export const pgSectionStyles = {
  root: {
    px: { xs: 2, sm: 3 },
    py: { xs: 6, md: 10 },
    scrollMarginTop: 64,
  },
  inner: {
    maxWidth: LANDING_MAX_WIDTH,
    mx: 'auto',
    display: 'grid',
    gap: { xs: 5, md: 8 },
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.1fr) minmax(0, 1fr)' },
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: FONTS.hand,
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'secondary.main',
    transform: 'rotate(-1.5deg)',
    display: 'inline-block',
    mb: 1,
  },
  title: {
    fontSize: { xs: '2.3rem', md: '3.2rem' },
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
  },
  titleAccent: {
    fontSize: { xs: '2.3rem', md: '3.2rem' },
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    fontStyle: 'italic',
    color: 'primary.main',
  },
  body: {
    mt: 2.5,
    maxWidth: 560,
    fontSize: '1.05rem',
  },
  points: {
    listStyle: 'none',
    m: 0,
    mt: 3,
    p: 0,
    display: 'grid',
    gap: 1.25,
    maxWidth: 560,
  },
  point: {
    display: 'flex',
    gap: 1.25,
    alignItems: 'flex-start',
  },
  check: {
    color: 'secondary.main',
    mt: '1px',
  },
  cta: {
    mt: 3.5,
  },
  chitWrap: {
    display: 'flex',
    justifyContent: 'center',
  },
  // A ruled chit pinned to the board, like a mess menu slip.
  chit: ((theme) => ({
    position: 'relative',
    width: '100%',
    maxWidth: 400,
    px: 3,
    pt: 4,
    pb: 3,
    bgcolor: theme.palette.background.paper,
    backgroundImage: `repeating-linear-gradient(transparent 0 ${LINE - 1}px, ${alpha(theme.palette.primary.main, 0.12)} ${LINE - 1}px ${LINE}px)`,
    backgroundPosition: `0 ${LINE * 2 + 6}px`,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '3px',
    boxShadow: `0 14px 32px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.45 : 0.1)}`,
    transform: { md: 'rotate(1.8deg)' },
  })) satisfies SxProps<Theme>,
  pin: ((theme) => ({
    position: 'absolute',
    top: 10,
    left: '50%',
    width: 16,
    height: 16,
    borderRadius: '50%',
    transform: 'translateX(-50%)',
    bgcolor: theme.palette.secondary.main,
    boxShadow: `0 2px 4px ${alpha(theme.palette.common.black, 0.35)}, inset -2px -2px 0 ${alpha(theme.palette.common.black, 0.2)}`,
  })) satisfies SxProps<Theme>,
  chitExample: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'text.secondary',
  },
  chitTitle: {
    fontFamily: FONTS.display,
    fontWeight: 600,
    fontSize: '1.35rem',
    lineHeight: `${LINE}px`,
  },
  chitRows: {
    listStyle: 'none',
    m: 0,
    p: 0,
  },
  chitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1.25,
    minHeight: LINE,
    lineHeight: `${LINE}px`,
  },
  chitTime: {
    width: 44,
    flexShrink: 0,
    fontFamily: MONO,
    fontSize: '0.8rem',
    color: 'text.secondary',
  },
  chitWhat: {
    flex: 1,
    minWidth: 0,
    fontFamily: FONTS.hand,
    fontSize: '1.3rem',
    fontWeight: 600,
    color: 'primary.main',
    lineHeight: 1.25,
  },
  chitCost: {
    fontFamily: MONO,
    fontSize: '0.85rem',
  },
  chitTotal: ((theme) => ({
    flexDirection: 'row',
    justifyContent: 'space-between',
    mt: 1.5,
    pt: 1,
    borderTop: `2px dashed ${theme.palette.divider}`,
    fontFamily: MONO,
    fontWeight: 700,
  })) satisfies SxProps<Theme>,
  chitProtein: {
    mt: 0.5,
    fontFamily: MONO,
    fontSize: '0.85rem',
    color: 'text.secondary',
  },
  chitNote: {
    position: 'absolute',
    right: 16,
    bottom: -18,
    fontFamily: FONTS.hand,
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'secondary.main',
    transform: 'rotate(-4deg)',
  },
};
