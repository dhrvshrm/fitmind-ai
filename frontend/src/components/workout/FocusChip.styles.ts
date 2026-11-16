import type { SxProps, Theme } from '@mui/material';

export const focusChipStyles = {
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0.75,
    mt: 0.5,
  },
  chip: {
    fontWeight: 600,
  },
} satisfies Record<string, SxProps<Theme>>;
