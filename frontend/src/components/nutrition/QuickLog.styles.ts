import type { SxProps, Theme } from '@mui/material';

export const quickLogStyles = {
  tabs: {
    mb: 2,
    minHeight: 40,
    borderBottom: '1px solid',
    borderColor: 'divider',
    '& .MuiTab-root': { minHeight: 40, px: 1.5 },
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1,
    mt: 1.5,
  },
  status: {
    mr: 'auto',
  },
} satisfies Record<string, SxProps<Theme>>;
