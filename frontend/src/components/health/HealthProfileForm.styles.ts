import type { SxProps, Theme } from '@mui/material';
import { FONTS } from '../../theme';

export const healthProfileFormStyles = {
  conditions: {
    display: 'grid',
    gap: 1,
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
    alignItems: 'start',
  },
  divider: {
    my: 3,
    borderStyle: 'dashed',
  },
  subheading: {
    fontFamily: FONTS.display,
    fontWeight: 600,
    mb: 2,
  },
  fields: {
    gap: 2.5,
  },
  link: {
    fontWeight: 600,
  },
  // Sticks to the bottom of the screen while there is something to save.
  footer: ((theme) => ({
    position: 'sticky',
    bottom: 0,
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    mt: 3,
    mx: { xs: -2, sm: -2.5 },
    mb: { xs: -2, sm: -2.5 },
    px: { xs: 2, sm: 2.5 },
    py: 1.5,
    bgcolor: 'background.paper',
    borderTop: `1px dashed ${theme.palette.divider}`,
    borderRadius: `0 0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px`,
  })) satisfies SxProps<Theme>,
  unsaved:
    (dirty: boolean): SxProps<Theme> => ({
      fontFamily: FONTS.hand,
      fontSize: '1.15rem',
      color: 'secondary.main',
      opacity: dirty ? 1 : 0,
      transition: 'opacity 160ms ease',
    }),
};
