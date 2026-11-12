import type { SxProps, Theme } from '@mui/material';

export const stepsCardStyles = {
  form: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 1.5,
  },
  dayField: {
    minWidth: 140,
    flex: { xs: '1 1 140px', sm: '0 0 160px' },
  },
  stepsField: {
    flex: { xs: '1 1 120px', sm: '0 0 140px' },
  },
  progress: {
    mt: 2.5,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 1.5,
    my: 2,
  },
  estimate: {
    mt: 2,
  },
  syncNote: {
    mt: 1.5,
  },
} satisfies Record<string, SxProps<Theme>>;
