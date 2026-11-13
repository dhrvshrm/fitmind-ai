import type { SxProps, Theme } from '@mui/material';
import { LANDING_MAX_WIDTH } from './layout';

export const landingFooterStyles = {
  root: {
    px: { xs: 2, sm: 3 },
    py: 5,
    borderTop: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
  },
  inner: {
    maxWidth: LANDING_MAX_WIDTH,
    mx: 'auto',
    flexDirection: { xs: 'column', md: 'row' },
    justifyContent: 'space-between',
    gap: 3,
  },
  brand: {
    gap: 1.25,
    maxWidth: 360,
  },
  meta: {
    textAlign: { xs: 'left', md: 'right' },
    display: 'grid',
    gap: 0.5,
    alignContent: 'end',
  },
} satisfies Record<string, SxProps<Theme>>;
