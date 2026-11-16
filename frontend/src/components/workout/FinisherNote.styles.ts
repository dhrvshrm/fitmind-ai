import type { SxProps, Theme } from '@mui/material';

export const finisherNoteStyles = {
  root: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1.25,
    mt: 2,
    p: 1.5,
    borderRadius: 2,
    border: '1px dashed',
    borderColor: 'secondary.main',
  },
  icon: {
    color: 'secondary.main',
    mt: '1px',
  },
  title: {
    fontWeight: 700,
  },
} satisfies Record<string, SxProps<Theme>>;
