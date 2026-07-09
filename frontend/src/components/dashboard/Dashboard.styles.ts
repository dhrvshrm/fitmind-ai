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
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'primary.light',
    color: 'primary.contrastText',
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
  },
} satisfies Record<string, SxProps<Theme>>;
