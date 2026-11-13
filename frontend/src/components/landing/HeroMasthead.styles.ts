import type { SxProps, Theme } from '@mui/material';
import { FONTS } from '../../theme';
import { LANDING_MAX_WIDTH } from './layout';

export const heroMastheadStyles = {
  root: {
    px: { xs: 2, sm: 3 },
    pt: { xs: 5, md: 8 },
    pb: { xs: 7, md: 11 },
  },
  inner: {
    maxWidth: LANDING_MAX_WIDTH,
    mx: 'auto',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0.5,
    ml: { xs: 0, md: 1 },
    mb: { xs: -0.5, md: -2 },
  },
  // Handwritten margin note, in neel ink.
  note: {
    fontFamily: FONTS.hand,
    fontSize: { xs: '1.35rem', md: '1.6rem' },
    fontWeight: 600,
    color: 'primary.main',
    transform: 'rotate(-3deg)',
    lineHeight: 1.1,
  },
  arrow: {
    width: { xs: 54, md: 80 },
    height: { xs: 36, md: 52 },
    color: 'primary.main',
    mt: 1.5,
  },
  title: {
    fontSize: { xs: '3.1rem', sm: '4.4rem', md: '6.1rem' },
    lineHeight: 0.98,
    letterSpacing: '-0.035em',
    fontWeight: 600,
  },
  line: {
    display: 'block',
  },
  // The last line: italic, in neel, with a clay hand-drawn underline.
  lastLine: ((theme) => ({
    position: 'relative',
    display: 'inline-block',
    fontStyle: 'italic',
    color: theme.palette.primary.main,
    pr: '0.1em',
  })) satisfies SxProps<Theme>,
  squiggle: ((theme) => ({
    position: 'absolute',
    left: 0,
    bottom: '-0.1em',
    width: '100%',
    height: '0.2em',
    color: theme.palette.secondary.light,
    zIndex: -1,
  })) satisfies SxProps<Theme>,
  lower: {
    mt: { xs: 5, md: 7 },
    display: 'grid',
    gap: { xs: 5, md: 8 },
    alignItems: 'end',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.1fr) minmax(0, 0.9fr)' },
  },
  body: {
    maxWidth: 560,
    fontSize: { xs: '1.05rem', md: '1.2rem' },
    lineHeight: 1.65,
    color: 'text.secondary',
  },
  ctas: {
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 1.5,
    mt: 3.5,
  },
  primary: {
    px: 3.5,
  },
  secondary: {
    textDecoration: 'underline',
    textUnderlineOffset: 6,
    textDecorationThickness: 1,
    '&:hover': { textDecorationThickness: 2, bgcolor: 'transparent' },
  },
  freeNote: {
    mt: 1.5,
  },
  // Three facts set like a ledger: rules above and between, no cards.
  ledger: {
    m: 0,
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
    borderTop: 2,
    borderColor: 'text.primary',
  },
  fact: {
    pt: 2,
    pb: { xs: 2, sm: 0 },
    px: { xs: 0, sm: 2 },
    borderBottom: { xs: 1, sm: 0 },
    borderLeft: { xs: 0, sm: 1 },
    borderColor: 'divider',
    '&:first-of-type': { pl: 0, borderLeft: 0 },
  },
  factValue: {
    fontFamily: FONTS.display,
    fontWeight: 600,
    fontSize: { xs: '1.9rem', md: '1.95rem' },
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
  },
  factLabel: {
    m: 0,
    mt: 0.5,
  },
};
