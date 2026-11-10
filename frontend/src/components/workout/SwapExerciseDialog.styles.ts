import type { SxProps, Theme } from '@mui/material';

export const swapExerciseDialogStyles = {
  content: {
    display: 'grid',
    gap: 1.5,
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    py: 2,
  },
  option: {
    gap: 1.5,
    borderRadius: 1,
  },
  thumb: {
    width: 56,
    height: 42,
    objectFit: 'contain',
    bgcolor: 'common.white',
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'divider',
    flexShrink: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
