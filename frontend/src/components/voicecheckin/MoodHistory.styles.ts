import type { SxProps, Theme } from '@mui/material';

export const moodHistoryStyles = {
  stack: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
  },
  chartWrap: {
    width: '100%',
    height: 240,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    mt: 1.5,
  },
  legendDot: (color: string): SxProps<Theme> => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    bgcolor: color,
    display: 'inline-block',
    mr: 0.75,
  }),
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listSkeleton: {
    height: 160,
  },
  list: {
    pt: 1,
    pb: 0.5,
  },
  item: {
    px: { xs: 2, sm: 2.5 },
    py: 1.25,
    gap: 1.5,
  },
  listIconWrap: {
    minWidth: 0,
  },
  listIcon: (color: string): SxProps<Theme> => ({
    fontSize: 24,
    color,
  }),
  listMood: {
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  energyChip: {
    fontVariantNumeric: 'tabular-nums',
  },
};
