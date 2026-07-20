import type { SxProps, Theme } from '@mui/material';

export const badgeModalStyles = {
  content: {
    textAlign: 'center',
    pt: 3,
    pb: 2,
  },
  iconWrap: (earned: boolean): SxProps<Theme> => ({
    width: 96,
    height: 96,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mx: 'auto',
    mb: 2,
    color: '#fff',
    background: earned
      ? 'linear-gradient(150deg, #aa3bff 0%, #7a1fd0 100%)'
      : 'linear-gradient(150deg, #b9b4c4 0%, #8c869b 100%)',
    boxShadow: earned ? '0px 8px 22px rgba(170, 59, 255, 0.36)' : 'none',
  }),
  icon: {
    fontSize: 48,
  },
  name: {
    fontWeight: 700,
  },
  statusChip: {
    mt: 1.5,
    fontWeight: 700,
  },
  sectionLabel: {
    fontWeight: 700,
    mt: 2.5,
    mb: 0.5,
  },
} satisfies Record<string, SxProps<Theme>>;
