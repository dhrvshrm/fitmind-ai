import type { SxProps, Theme } from '@mui/material';
import { FONTS } from '../../theme';
import { LANDING_MAX_WIDTH } from './layout';

export const dayTimelineStyles = {
  root: {
    px: { xs: 2, sm: 3 },
    py: { xs: 8, md: 12 },
    // Anchor jumps land below the sticky nav.
    scrollMarginTop: 64,
  },
  inner: {
    maxWidth: LANDING_MAX_WIDTH,
    mx: 'auto',
  },
  heading: {
    maxWidth: 760,
    mb: { xs: 5, md: 8 },
  },
  eyebrow: {
    color: 'secondary.main',
    display: 'block',
    mb: 1.5,
  },
  title: {
    fontSize: { xs: '2rem', md: '3rem' },
    lineHeight: 1.08,
  },
  example: {
    mt: 2,
  },
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
  },
  // Time | rail | text and artifact. On phones the time sits above the text.
  stop: {
    display: 'grid',
    gridTemplateColumns: { xs: '28px minmax(0, 1fr)', md: '150px 48px minmax(0, 1fr)' },
    gridTemplateAreas: { xs: '"rail time" "rail body"', md: '"time rail body"' },
    columnGap: { xs: 1.5, md: 0 },
  },
  timeCol: {
    gridArea: 'time',
    textAlign: { xs: 'left', md: 'right' },
    pr: { md: 2.5 },
  },
  time: {
    fontFamily: FONTS.display,
    fontWeight: 600,
    fontSize: { xs: '2rem', md: '2.9rem' },
    lineHeight: 1,
    letterSpacing: '-0.02em',
    color: 'text.primary',
  },
  period: {
    fontFamily: FONTS.body,
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'text.secondary',
    ml: 0.5,
  },
  // A dashed line down the day with a dot at each stop.
  rail: ((theme) => ({
    gridArea: 'rail',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '50%',
      borderLeft: `2px dashed ${theme.palette.divider}`,
    },
  })) satisfies SxProps<Theme>,
  dot: ((theme) => ({
    position: 'relative',
    mt: { xs: 1.5, md: 2 },
    width: 14,
    height: 14,
    borderRadius: '50%',
    bgcolor: theme.palette.background.default,
    border: `3px solid ${theme.palette.primary.main}`,
  })) satisfies SxProps<Theme>,
  // Text and artifact side by side, swapping sides on every other stop.
  body:
    (flip: boolean): SxProps<Theme> => ({
      gridArea: 'body',
      display: 'grid',
      gap: { xs: 3, md: 5 },
      alignItems: 'center',
      gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' },
      pl: { md: 2.5 },
      pt: { xs: 1.5, md: 1 },
      pb: { xs: 7, md: 10 },
      '& > :first-of-type': { order: { lg: flip ? 2 : 1 } },
      '& > :last-of-type': { order: { lg: flip ? 1 : 2 } },
    }),
  text: {
    maxWidth: 440,
  },
  stopTitle: {
    mb: 1,
    fontSize: { xs: '1.4rem', md: '1.75rem' },
  },
  artifact: {
    display: 'flex',
    justifyContent: { xs: 'flex-start', lg: 'center' },
    // Room for tilted paper and stamps that poke out.
    px: { xs: 1, md: 3 },
    py: 2,
  },
};
