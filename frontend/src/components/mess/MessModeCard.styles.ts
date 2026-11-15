import type { SxProps, Theme } from '@mui/material';
import { FONTS } from '../../theme';

export const messModeCardStyles = {
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.25,
  },
  // A handwritten nudge, like a note in the margin.
  nudge: {
    fontFamily: FONTS.hand,
    fontSize: '1.2rem',
    lineHeight: 1.3,
    color: 'secondary.main',
  },
} satisfies Record<string, SxProps<Theme>>;
