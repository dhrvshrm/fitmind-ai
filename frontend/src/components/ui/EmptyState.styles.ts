import type { SxProps, Theme } from '@mui/material';

const base = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 1,
} as const;

export const emptyStateStyles = {
  root: {
    ...base,
    py: { xs: 5, sm: 7 },
    px: 2,
  },
  rootCompact: {
    ...base,
    py: 3,
    px: 2,
  },
  title: {
    mt: 1,
  },
  description: {
    maxWidth: 380,
  },
  action: {
    mt: 1.5,
  },
} satisfies Record<string, SxProps<Theme>>;
