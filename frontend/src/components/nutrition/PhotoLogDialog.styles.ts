import type { SxProps, Theme } from '@mui/material';

export const photoLogDialogStyles = {
  hint: {
    mb: 2,
  },
  pick: {
    py: 4,
    borderStyle: 'dashed',
  },
  preview: {
    display: 'block',
    width: '100%',
    maxHeight: 320,
    objectFit: 'contain',
    borderRadius: 2,
    bgcolor: 'action.hover',
  },
  change: {
    mt: 1,
  },
  error: {
    mt: 2,
  },
  privacy: {
    mt: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
