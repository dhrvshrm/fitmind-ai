import { FONTS } from '../../theme';
import { LANDING_MAX_WIDTH } from './layout';

export const nextSectionStyles = {
  root: {
    px: { xs: 2, sm: 3 },
    py: { xs: 6, md: 9 },
    scrollMarginTop: 64,
  },
  inner: {
    maxWidth: LANDING_MAX_WIDTH,
    mx: 'auto',
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
  body: {
    mt: 1.5,
    maxWidth: 620,
  },
  grid: {
    mt: { xs: 3.5, md: 5 },
    display: 'grid',
    gap: { xs: 2, md: 3 },
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
  },
  item: {
    p: 2.5,
    borderRadius: 2,
    border: '1px dashed',
    borderColor: 'divider',
    display: 'flex',
    flexDirection: 'column',
    gap: 1.25,
  },
  itemHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
  },
  itemTitle: {
    fontWeight: 600,
  },
};
