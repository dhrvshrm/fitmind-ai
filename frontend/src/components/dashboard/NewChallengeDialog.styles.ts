import type { SxProps, Theme } from '@mui/material';

export const newChallengeDialogStyles = {
  fields: {
    gap: 2,
    pt: 1,
  },
  kinds: {
    width: '100%',
  },
  kind: {
    justifyContent: 'flex-start',
    textAlign: 'left',
    textTransform: 'none',
    py: 1.25,
  },
  kindText: {
    alignItems: 'flex-start',
    gap: 0.25,
  },
  actions: {
    px: 3,
    pb: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
