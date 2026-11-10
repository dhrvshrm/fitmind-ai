import type { SxProps, Theme } from '@mui/material';
import { hoverLift } from '../ui/interactive.styles';

export const exerciseLibraryStyles = {
  filters: {
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: { xs: 'stretch', sm: 'center' },
    gap: 1.5,
    mb: 2,
  },
  search: {
    flex: 1,
    minWidth: 0,
  },
  muscle: {
    minWidth: 170,
  },
  grid: {
    display: 'grid',
    gap: 1.5,
    gridTemplateColumns: {
      xs: 'minmax(0, 1fr)',
      sm: 'repeat(2, minmax(0, 1fr))',
      lg: 'repeat(4, minmax(0, 1fr))',
    },
  },
  skeleton: {
    height: 210,
  },
  card: {
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    ...hoverLift,
    '&:hover, &:focus-visible': { borderColor: 'primary.main' },
  },
  thumb: {
    width: '100%',
    aspectRatio: '3 / 2',
    objectFit: 'cover',
    borderBottom: '1px solid',
    borderColor: 'divider',
  },
  cardText: {
    p: 1.25,
    display: 'grid',
    gap: 0.25,
  },
  name: {
    fontWeight: 600,
  },
  chip: {
    justifySelf: 'start',
    mt: 0.5,
  },
} satisfies Record<string, SxProps<Theme>>;
