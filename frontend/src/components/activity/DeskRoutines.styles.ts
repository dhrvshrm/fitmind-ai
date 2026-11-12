import type { SxProps, Theme } from '@mui/material';
import { hoverLift } from '../ui/interactive.styles';

export const deskRoutinesStyles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
    gap: 1.5,
  },
  card: {
    ...hoverLift,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    gap: 0.5,
    p: 2,
    borderRadius: 2,
    border: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 1,
  },
  name: {
    fontWeight: 600,
  },
  meta: {
    mt: 'auto',
    pt: 1,
  },
} satisfies Record<string, SxProps<Theme>>;
