import type { SxProps, Theme } from '@mui/material';

export const badgeWallStyles = {
  card: {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 2,
  },
  title: {
    fontWeight: 700,
  },
  countChip: {
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: {
      xs: 'repeat(2, 1fr)',
      sm: 'repeat(3, 1fr)',
      md: 'repeat(6, 1fr)',
    },
  },
  badgeCard: (earned: boolean): SxProps<Theme> => ({
    p: 2,
    borderRadius: 2.5,
    textAlign: 'center',
    cursor: 'pointer',
    opacity: earned ? 1 : 0.6,
    filter: earned ? 'none' : 'grayscale(0.6)',
    borderColor: earned ? 'rgba(170, 59, 255, 0.28)' : 'divider',
    bgcolor: earned ? 'rgba(170, 59, 255, 0.04)' : 'background.paper',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: 4,
    },
  }),
  iconWrap: (earned: boolean): SxProps<Theme> => ({
    width: 56,
    height: 56,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mx: 'auto',
    mb: 1,
    color: earned ? '#fff' : 'text.disabled',
    bgcolor: earned ? undefined : 'action.hover',
    background: earned ? 'linear-gradient(150deg, #aa3bff 0%, #7a1fd0 100%)' : undefined,
  }),
  badgeName: {
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  newChip: {
    mt: 0.75,
  },
};
