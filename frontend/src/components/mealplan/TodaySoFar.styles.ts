import { alpha, type SxProps, type Theme } from '@mui/material';
import { FONTS } from '../../theme';

export const todaySoFarStyles = {
  // A clay rule down the left, like a note pinned to the plan.
  card: ((theme) => ({
    display: 'grid',
    gap: 1,
    px: { xs: 2, sm: 2.5 },
    py: 2,
    borderLeft: `3px solid ${alpha(theme.palette.secondary.main, 0.7)}`,
  })) satisfies SxProps<Theme>,
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 1,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: 600,
  },
  numbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 2,
    flexWrap: 'wrap',
  },
  number: {
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
  },
  bar: {
    height: 8,
    borderRadius: 999,
  },
  message: {
    mt: 0.5,
  },
};
