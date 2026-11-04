import type { SxProps, Theme } from '@mui/material';

export const quickPicksStyles = {
  skeleton: {
    height: 72,
  },
  group: {
    '& + &': { mt: 1.5 },
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    mt: 0.5,
  },
  chip: {
    maxWidth: '100%',
    fontWeight: 500,
  },
} satisfies Record<string, SxProps<Theme>>;
