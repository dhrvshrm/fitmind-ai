import type { SxProps, Theme } from '@mui/material';

export const privacyCardStyles = {
  row: {
    display: 'flex',
    gap: 1.25,
    alignItems: 'flex-start',
  },
  icon: {
    mt: '1px',
    color: 'primary.main',
  },
  withdraw: {
    mt: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
