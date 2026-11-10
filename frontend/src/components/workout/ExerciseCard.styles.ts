import type { SxProps, Theme } from '@mui/material';
import { hoverLift } from '../ui/interactive.styles';

export const exerciseCardStyles = {
  card: (done: boolean): SxProps<Theme> => ({
    p: { xs: 1.5, sm: 2 },
    display: 'flex',
    alignItems: { xs: 'flex-start', sm: 'center' },
    flexWrap: { xs: 'wrap', sm: 'nowrap' },
    gap: 2,
    borderRadius: 2,
    opacity: done ? 0.65 : 1,
    ...hoverLift,
    '&:hover': { borderColor: 'primary.main' },
  }),
  thumb: {
    width: { xs: 84, sm: 128 },
    aspectRatio: '3 / 2',
    objectFit: 'cover',
    borderRadius: 1.5,
    flexShrink: 0,
  },
  thumbPlaceholder: {
    width: { xs: 84, sm: 128 },
    aspectRatio: '3 / 2',
    borderRadius: 1.5,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    bgcolor: 'action.hover',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 1,
  },
  name: (done: boolean): SxProps<Theme> => ({
    fontWeight: 700,
    lineHeight: 1.3,
    textDecoration: done ? 'line-through' : 'none',
  }),
  level: {
    textTransform: 'capitalize',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: { xs: 1, sm: 1.5 },
    mt: 1,
  },
  stat: {
    display: 'grid',
    lineHeight: 1.1,
  },
  statValue: {
    whiteSpace: 'nowrap',
    fontWeight: 700,
    color: 'primary.main',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.2,
  },
  divider: {
    width: '1px',
    alignSelf: 'stretch',
    bgcolor: 'divider',
  },
  effort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0.5,
    mt: 1,
    color: 'text.secondary',
    fontSize: 14,
  },
  actions: {
    flexDirection: { xs: 'row', sm: 'column' },
    alignItems: { xs: 'center', sm: 'stretch' },
    gap: 0.5,
    flexShrink: 0,
    width: { xs: '100%', sm: 'auto' },
    justifyContent: { xs: 'flex-end', sm: 'center' },
    '& .MuiButton-root': { justifyContent: 'flex-start', whiteSpace: 'nowrap' },
  },
};
