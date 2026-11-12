import { alpha, type SxProps, type Theme } from '@mui/material';

export const flexibleWeekCardStyles = {
  strip: {
    display: 'grid',
    gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))', sm: 'repeat(7, minmax(0, 1fr))' },
    gap: 1,
  },
  cell: (flexible: boolean, isToday: boolean): SxProps<Theme> => ({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0.5,
    px: 0.5,
    py: 1.25,
    borderRadius: 2,
    border: '1px solid',
    borderColor: isToday ? 'primary.main' : 'divider',
    bgcolor: (theme: Theme) => (flexible ? alpha(theme.palette.primary.main, 0.08) : 'transparent'),
    textAlign: 'center',
    minWidth: 0,
  }),
  weekday: {
    color: 'text.secondary',
    fontWeight: 600,
  },
  kcal: {
    fontWeight: 700,
  },
  chip: {
    maxWidth: '100%',
    height: 22,
    '& .MuiChip-label': { px: 0.75, fontSize: 11 },
    '& .MuiChip-icon': { fontSize: 14 },
  },
  remove: {
    position: 'absolute',
    top: 2,
    right: 2,
    p: 0.25,
    fontSize: 14,
  },
} satisfies Record<string, SxProps<Theme> | ((...args: never[]) => SxProps<Theme>)>;
