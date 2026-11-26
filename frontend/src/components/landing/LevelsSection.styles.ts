import { alpha, type SxProps, type Theme } from '@mui/material';
import { FONTS } from '../../theme';
import { LANDING_MAX_WIDTH } from './layout';

const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

export const levelsSectionStyles = {
  root: {
    px: { xs: 2, sm: 3 },
    py: { xs: 6, md: 10 },
    scrollMarginTop: 64,
  },
  inner: {
    maxWidth: LANDING_MAX_WIDTH,
    mx: 'auto',
  },
  head: {
    maxWidth: 720,
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
    fontSize: '1.05rem',
  },
  cards: {
    mt: { xs: 4, md: 6 },
    display: 'grid',
    gap: { xs: 3, md: 4 },
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
  },
  // An index card with a coloured top rule, slightly tilted like it was pinned up.
  card: (index: number): SxProps<Theme> =>
    (theme) => ({
      position: 'relative',
      p: 3,
      pt: 3.5,
      borderRadius: 2,
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderTop: `5px solid ${[theme.palette.success.main, theme.palette.primary.main, theme.palette.secondary.main][index % 3]}`,
      boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.35 : 0.08)}`,
      transform: { md: `rotate(${[-0.8, 0.5, -0.4][index % 3]}deg)` },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
    }),
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
  },
  label: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'text.secondary',
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: '1.4rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  points: {
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gap: 1,
    flex: 1,
  },
  point: {
    display: 'flex',
    gap: 1,
    alignItems: 'flex-start',
  },
  check: {
    color: 'secondary.main',
    mt: '2px',
    fontSize: 18,
  },
  today: {
    fontFamily: MONO,
    fontSize: '0.85rem',
    color: 'text.secondary',
    borderTop: '1px dashed',
    borderColor: 'divider',
    pt: 1.25,
  },
  cta: {
    mt: { xs: 4, md: 5 },
  },
};
