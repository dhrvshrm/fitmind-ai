import type { SxProps, Theme } from '@mui/material';

export const tagInputStyles = {
  label: {
    mb: 1,
  },
  count: {
    ml: 1,
    fontWeight: 400,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
  },
  moreChip: {
    borderStyle: 'dashed',
  },
  input: {
    mt: 1.5,
    maxWidth: 420,
  },
  addIcon: {
    mr: 1,
    color: 'text.secondary',
  },
} satisfies Record<string, SxProps<Theme>>;
