import type { SxProps, Theme } from '@mui/material';

export const levelCardStyles = {
  card: {
    p: { xs: 3, sm: 4 },
    borderRadius: 3,
    background: 'linear-gradient(155deg, #ffffff 0%, #faf7ff 100%)',
    borderColor: 'rgba(170, 59, 255, 0.14)',
  },
  headerRow: {
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: { xs: 'flex-start', sm: 'center' },
    gap: 2,
    mb: 3,
  },
  levelBadge: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    background: 'linear-gradient(150deg, #aa3bff 0%, #7a1fd0 100%)',
    boxShadow: '0px 8px 22px rgba(170, 59, 255, 0.36)',
    flexShrink: 0,
  },
  levelNumber: {
    fontWeight: 800,
    lineHeight: 1,
  },
  titleBlock: {
    minWidth: 0,
  },
  levelTitle: {
    fontWeight: 700,
  },
  totalXp: {
    mt: 0.25,
  },
} satisfies Record<string, SxProps<Theme>>;
