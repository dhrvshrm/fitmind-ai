import { alpha, type SxProps, type Theme } from '@mui/material';
import { FONTS } from '../../theme';
import { LANDING_MAX_WIDTH } from './layout';

const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

export const reportsSectionStyles = {
  root: ((theme) => ({
    px: { xs: 2, sm: 3 },
    py: { xs: 6, md: 10 },
    scrollMarginTop: 64,
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.035),
  })) satisfies SxProps<Theme>,
  inner: {
    maxWidth: LANDING_MAX_WIDTH,
    mx: 'auto',
    display: 'grid',
    gap: { xs: 5, md: 8 },
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1.05fr)' },
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
  // A lab report slip: a header band, then each value and what it changed.
  slip: ((theme) => ({
    width: '100%',
    maxWidth: 520,
    mx: 'auto',
    borderRadius: 2,
    overflow: 'hidden',
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    boxShadow: `0 14px 40px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.1)}`,
    transform: { md: 'rotate(0.8deg)' },
  })) satisfies SxProps<Theme>,
  slipHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: 2.5,
    py: 1.5,
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
  },
  slipTitle: {
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  example: {
    ml: 'auto',
    fontSize: '0.75rem',
    opacity: 0.85,
  },
  rows: {
    listStyle: 'none',
    m: 0,
    p: 0,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr auto', sm: '110px 90px 1fr' },
    gap: { xs: 0.5, sm: 2 },
    px: 2.5,
    py: 1.5,
    borderBottom: '1px dashed',
    borderColor: 'divider',
    alignItems: 'baseline',
  },
  marker: {
    fontWeight: 600,
  },
  value: {
    fontFamily: MONO,
    color: 'secondary.main',
    textAlign: { xs: 'right', sm: 'left' },
  },
  change: {
    gridColumn: { xs: '1 / -1', sm: 'auto' },
    color: 'text.secondary',
    fontSize: '0.9rem',
  },
  slipNote: {
    fontFamily: FONTS.hand,
    fontSize: '1.3rem',
    color: 'secondary.main',
    textAlign: 'right',
    px: 2.5,
    py: 1.25,
  },
};
