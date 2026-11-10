import type { SxProps, Theme } from '@mui/material';

export const quickSessionCardStyles = {
  controls: {
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: { xs: 'stretch', sm: 'flex-end' },
    flexWrap: 'wrap',
    gap: 2,
  },
  group: {
    gap: 0.5,
  },
  start: {
    ml: { sm: 'auto' },
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, SxProps<Theme>>;
