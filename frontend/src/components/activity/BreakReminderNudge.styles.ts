import type { SxProps, Theme } from '@mui/material';

export const breakReminderNudgeStyles = {
  snackbar: {
    maxWidth: { xs: 'calc(100% - 32px)', sm: 420 },
  },
  alert: {
    width: '100%',
    alignItems: 'flex-start',
    boxShadow: 6,
    '& .MuiAlert-action': {
      alignItems: 'flex-end',
      pt: 0,
    },
  },
  actions: {
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: 'flex-end',
    gap: 0.5,
  },
} satisfies Record<string, SxProps<Theme>>;
