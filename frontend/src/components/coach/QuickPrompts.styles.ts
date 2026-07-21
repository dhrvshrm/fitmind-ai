import type { SxProps, Theme } from '@mui/material';

export const quickPromptsStyles = {
  root: {
    mb: 1,
  },
  label: {
    mb: 1,
    display: 'block',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
