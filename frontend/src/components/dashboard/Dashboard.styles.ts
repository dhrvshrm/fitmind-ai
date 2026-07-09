import type { SxProps, Theme } from '@mui/material';

export const dashboardStyles = {
  welcome: {
    fontWeight: 700,
  },
  statsGrid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
    mt: 3,
  },
  statCard: {
    p: 2.5,
    borderRadius: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
    background: 'linear-gradient(155deg, #ffffff 0%, #faf7ff 100%)',
    borderColor: 'rgba(170, 59, 255, 0.14)',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: 6,
    },
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 2.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    background: 'linear-gradient(150deg, #aa3bff 0%, #7a1fd0 100%)',
    boxShadow: '0px 6px 14px rgba(170, 59, 255, 0.32)',
  },
  statValue: {
    fontWeight: 700,
    lineHeight: 1.1,
  },
  statSkeleton: {
    borderRadius: 3,
    height: 118,
  },
  sectionTitle: {
    fontWeight: 700,
    mt: 4,
    mb: 2,
  },
  actionsGrid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
  },
  actionButton: {
    py: 1.5,
    justifyContent: 'flex-start',
    borderColor: 'rgba(170, 59, 255, 0.28)',
    transition: 'transform 0.15s ease, background-color 0.15s ease',
    '&:hover': {
      bgcolor: 'rgba(170, 59, 255, 0.06)',
      borderColor: 'primary.main',
      transform: 'translateY(-2px)',
    },
  },
} satisfies Record<string, SxProps<Theme>>;
