import type { SxProps, Theme } from '@mui/material';

export const choiceChipsStyles = {
  root: {
    display: 'grid',
    gap: 0.75,
  },
  label: {
    fontWeight: 600,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0.75,
  },
} satisfies Record<string, SxProps<Theme>>;
