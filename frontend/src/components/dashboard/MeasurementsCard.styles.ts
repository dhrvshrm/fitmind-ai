import type { SxProps, Theme } from '@mui/material';

export const measurementsCardStyles = {
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 2,
  },
  summaryItem: {
    minWidth: 0,
  },
  value: {
    fontWeight: 700,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1,
    mt: 0.5,
  },
  chart: {
    width: '100%',
    height: 200,
    mt: 2,
  },
} satisfies Record<string, SxProps<Theme>>;
