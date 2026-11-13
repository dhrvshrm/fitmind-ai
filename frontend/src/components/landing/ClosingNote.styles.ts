import type { SxProps, Theme } from '@mui/material';
import { FONTS } from '../../theme';

export const closingNoteStyles = {
  root: {
    px: { xs: 2, sm: 3 },
    pt: { xs: 6, md: 8 },
    pb: { xs: 10, md: 14 },
  },
  inner: {
    maxWidth: 900,
    mx: 'auto',
    textAlign: 'center',
  },
  line: {
    fontSize: { xs: '2.3rem', md: '4rem' },
    lineHeight: 1.04,
    letterSpacing: '-0.03em',
  },
  // Handwritten sign-off under the line.
  note: {
    fontFamily: FONTS.hand,
    fontSize: { xs: '1.6rem', md: '2rem' },
    fontWeight: 700,
    color: 'secondary.main',
    transform: 'rotate(-2deg)',
    mt: 2,
  },
  actions: {
    flexDirection: { xs: 'column', sm: 'row' },
    justifyContent: 'center',
    gap: 1.5,
    mt: 4,
  },
  primary: {
    px: 3.5,
  },
  secondary: {
    textDecoration: 'underline',
    textUnderlineOffset: 6,
    '&:hover': { bgcolor: 'transparent', textDecorationThickness: 2 },
  },
} satisfies Record<string, SxProps<Theme>>;
