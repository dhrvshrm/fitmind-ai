import { alpha, type SxProps, type Theme } from '@mui/material';
import { FONTS } from '../../theme';

/** Distance between the ruled lines; text sits on them. */
const LINE = 40;

export const promisesPageStyles = {
  root: {
    px: { xs: 2, sm: 3 },
    py: { xs: 6, md: 10 },
    scrollMarginTop: 64,
  },
  // Ruled notebook paper with a clay margin line, set slightly askew.
  page: ((theme) => ({
    position: 'relative',
    maxWidth: 820,
    mx: 'auto',
    pl: { xs: 5, md: 11 },
    pr: { xs: 2.5, md: 6 },
    py: { xs: 4, md: 6 },
    bgcolor: theme.palette.background.paper,
    backgroundImage: `repeating-linear-gradient(transparent 0 ${LINE - 1}px, ${alpha(theme.palette.primary.main, 0.14)} ${LINE - 1}px ${LINE}px)`,
    backgroundPosition: '0 22px',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '4px',
    boxShadow: `0 18px 40px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.4 : 0.08)}`,
    transform: { md: 'rotate(-0.6deg)' },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: { xs: 28, md: 64 },
      borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.55)}`,
    },
  })) satisfies SxProps<Theme>,
  eyebrow: {
    color: 'secondary.main',
    display: 'block',
  },
  title: {
    fontSize: { xs: '2rem', md: '2.8rem' },
    lineHeight: `${LINE * 1.5}px`,
  },
  list: {
    listStyle: 'none',
    m: 0,
    p: 0,
    mt: 1,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.25,
  },
  cross: {
    flexShrink: 0,
    width: 22,
    height: 22,
    mt: '9px',
    color: 'secondary.main',
  },
  // Handwriting, sitting on the ruled lines.
  itemText: {
    fontFamily: FONTS.hand,
    fontSize: { xs: '1.45rem', md: '1.75rem' },
    fontWeight: 600,
    lineHeight: `${LINE}px`,
    color: 'primary.main',
  },
  signature: {
    fontFamily: FONTS.hand,
    fontSize: '1.7rem',
    fontWeight: 700,
    textAlign: 'right',
    mt: 2,
    color: 'text.secondary',
    '&::before': { content: '"-- "' },
  },
};
