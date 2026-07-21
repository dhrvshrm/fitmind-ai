import type { SxProps, Theme } from '@mui/material';

export const inputBoxStyles = {
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  field: {
    flex: 1,
  },
  sendButton: {
    width: 48,
    height: 48,
    flexShrink: 0,
  },
} satisfies Record<string, SxProps<Theme>>;
