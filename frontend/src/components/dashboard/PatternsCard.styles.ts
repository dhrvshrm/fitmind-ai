import type { SxProps, Theme } from '@mui/material';

export const patternsCardStyles = {
  list: {
    gap: 1.5,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.5,
  },
  text: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0.25,
  },
} satisfies Record<string, SxProps<Theme>>;
