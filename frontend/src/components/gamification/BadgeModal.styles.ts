import type { SxProps, Theme } from '@mui/material';

export const badgeModalStyles = {
  content: {
    textAlign: 'center',
    pt: 3,
    pb: 2,
  },
  iconWrap: (earned: boolean): SxProps<Theme> => ({
    width: 88,
    height: 88,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mx: 'auto',
    mb: 2,
    color: earned ? 'primary.contrastText' : 'text.disabled',
    bgcolor: earned ? 'primary.main' : 'action.disabledBackground',
  }),
  icon: {
    fontSize: 44,
  },
  statusChip: {
    mt: 1.5,
  },
  sectionLabel: {
    mt: 2.5,
    mb: 0.5,
  },
  actions: {
    px: 3,
    pb: 2.5,
  },
} satisfies Record<string, SxProps<Theme> | ((earned: boolean) => SxProps<Theme>)>;
