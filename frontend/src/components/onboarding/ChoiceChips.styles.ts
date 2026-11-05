import type { SxProps, Theme } from '@mui/material';

export const choiceChipsStyles = {
  label: {
    mb: 1,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
  },
  error: {
    display: 'block',
    mt: 0.75,
  },
} satisfies Record<string, SxProps<Theme>>;
