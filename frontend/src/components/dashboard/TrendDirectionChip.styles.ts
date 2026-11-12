import type { SxProps, Theme } from '@mui/material';

export const trendDirectionChipStyles = {
  chip: {
    '& .MuiChip-icon': { color: 'primary.main' },
  },
} satisfies Record<string, SxProps<Theme>>;
