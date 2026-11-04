import type { SxProps, Theme } from '@mui/material';

export const heightFieldStyles = {
  root: {
    width: '100%',
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 1,
    mb: 1,
  },
  toggle: {
    py: 0.25,
    px: 1.25,
    fontSize: '0.75rem',
    textTransform: 'none',
  },
  feetRow: {
    flexDirection: 'row',
    gap: 1,
  },
  helper: {
    mx: 1.75,
  },
} satisfies Record<string, SxProps<Theme>>;
