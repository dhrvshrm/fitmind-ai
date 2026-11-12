import type { SxProps, Theme } from '@mui/material';

export const menuDialogStyles = {
  description: {
    mb: 2,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1,
    mt: 1.5,
  },
  fileChip: {
    maxWidth: 240,
  },
  error: {
    mt: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
