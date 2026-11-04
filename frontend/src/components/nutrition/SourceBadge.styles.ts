import type { SxProps, Theme } from '@mui/material';

export const sourceBadgeStyles = {
  chip: {
    height: 22,
    fontSize: '0.7rem',
    fontWeight: 600,
    '& .MuiChip-icon': { fontSize: 14 },
  },
} satisfies Record<string, SxProps<Theme>>;
