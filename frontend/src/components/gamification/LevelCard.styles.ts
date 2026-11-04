import type { SxProps, Theme } from '@mui/material';

export const levelCardStyles = {
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    mb: 3,
  },
  levelBadge: {
    width: { xs: 72, sm: 88 },
    height: { xs: 72, sm: 88 },
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'primary.contrastText',
    bgcolor: 'primary.main',
    flexShrink: 0,
  },
  levelNumber: {
    fontWeight: 700,
    lineHeight: 1,
  },
  titleBlock: {
    minWidth: 0,
  },
  levelLabel: {
    display: 'block',
  },
  totalXp: {
    mt: 0.25,
  },
} satisfies Record<string, SxProps<Theme>>;
