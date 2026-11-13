import type { SxProps, Theme } from '@mui/material';
import { FONTS } from '../../theme';
import { LANDING_MAX_WIDTH } from './layout';

export const faqColumnsStyles = {
  root: {
    px: { xs: 2, sm: 3 },
    py: { xs: 8, md: 12 },
    scrollMarginTop: 64,
  },
  // Heading on the left, questions on the right (stacked on phones).
  inner: {
    maxWidth: LANDING_MAX_WIDTH,
    mx: 'auto',
    display: 'grid',
    gap: { xs: 4, md: 8 },
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 0.35fr) minmax(0, 1fr)' },
  },
  heading: {
    position: { md: 'sticky' },
    top: { md: 96 },
    alignSelf: 'start',
  },
  eyebrow: {
    color: 'secondary.main',
    display: 'block',
    mb: 1.5,
  },
  title: {
    fontSize: { xs: '2rem', md: '2.6rem' },
    lineHeight: 1.08,
  },
  grid: {
    m: 0,
    display: 'grid',
    columnGap: 5,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
  },
  item: {
    py: 3,
    borderTop: 2,
    borderColor: 'text.primary',
  },
  q: {
    fontFamily: FONTS.display,
    fontWeight: 600,
    fontSize: '1.25rem',
    lineHeight: 1.3,
  },
  a: {
    m: 0,
    mt: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
